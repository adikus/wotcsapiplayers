var cls = require("./../lib/class");
var _ = require("underscore");
var DB = require("./../core/db");
var Player = require("./../models/player");
var Regions = require('./../shared/regions');

var ClanCollection = cls.Class.extend({
    init: function (ids, clans) {
        this.ids = ids;
        this.clans = clans || {};
    },

    find: function (fields, callback) {
        var self = this;

        DB.Clan.find({_id: {$in: this.ids}}).select(fields).exec(function (err, clans) {
            _.each(clans, function (clan) {
                self.clans[clan._id].name = clan.n;
                self.clans[clan._id].tag = clan.t;
            });
            callback(err);
        });
    },

    findPlayers: function (callback) {
        var self = this;

        DB.Player.find({c: {$in: this.ids}}, function (err, players) {
            var players = _.map(players, function (doc) {
                return new Player(doc._id, doc);
            });

            _.each(players, function (player) {
                if (!self.clans[player.doc.c]){
                    self.clans[player.doc.c] = {};
                }
                var data = player.getData();
                self.addVehsToTotal(data);
                self.addStatsToTotal(data);
            });

            callback(err);
        });
    },

    getData: function() {
        return _(this.clans).sortBy('SC').reverse();
    },

    // TODO: extract into VehCollection
    addVehsToTotal: function (data) {
        var vehs = data.vehs;

        if (!this.clans[data.clan_id].vehs) {
            this.clans[data.clan_id].vehs = {1: [], 2: [], 3: [], 4: []};
        }

        var clanVehs = this.clans[data.clan_id].vehs;
        _.each(vehs, function (typeVehs, type) {
            _.each(typeVehs.tanks, function (veh) {
                if (veh.tier == 10) {
                    var found = _(clanVehs[type]).any(function (clanVeh) {
                        if (veh.id == clanVeh.id) {
                            clanVeh.battles += veh.battles;
                            clanVeh.wins += veh.wins;
                            clanVeh.count++;
                            return true;
                        }
                        return false;
                    });
                    if (!found) {
                        var newVeh = _.clone(veh);
                        newVeh.count = 1;
                        delete newVeh.updated_at;

                        clanVehs[type].push(newVeh);
                    }
                }
            });
        });
    },

    // TODO: extract into StatsCollection
    addStatsToTotal: function (data) {
        var  stats = data.stats_current;

        if (!this.clans[data.clan_id].stats) {
            this.clans[data.clan_id].stats = stats;
            this.clans[data.clan_id].stats.member_count = 1;
        } else {
            var clanStats = this.clans[data.clan_id].stats;
            var keys = ['GPL', 'WIN', 'DEF', 'SUR', 'FRG', 'SPT', 'ACR', 'DMG', 'CPT', 'DPT', 'EXP', 'WN7', 'EFR', 'SC3'];

            _(keys).each(function (key) {
                if(_(stats[key]).isString()){
                    clanStats[key] = (parseFloat(clanStats[key]) + parseFloat(stats[key])).toFixed(2);
                }else{
                    clanStats[key] += stats[key];
                }
            });
            clanStats.member_count++;
        }
    }
});

ClanCollection.top = function(region, limit, callback) {
    var cond = region > 0 ? {_id: Regions.queryConditions(region)} : {};
    cond.SC = {$gt: 0};

    DB.Stat.find(cond).select("_id SC").sort("-SC").limit(limit || 100).exec(function (err, docs) {
        var clans = _(docs).chain().map(function (clan) {
            return [clan._id, {wid: clan._id, SC: clan.SC}];
        }).object().value();

        var collection = new ClanCollection(_(clans).keys(), clans);
        collection.find('t n', function (err) {
            collection.findPlayers(function (err) {
                callback(err, collection.getData());
            });
        });
    });
};

module.exports = ClanCollection;
