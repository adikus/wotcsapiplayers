var cls = require("./../lib/class");
var _ = require("underscore");
var DB = require("./../core/db");
var Player = require("./../models/player");
var Regions = require('./../shared/regions');
var ClanStatsCollection = require('./clan_stats_collection');
var ClanVehsCollection = require('./clan_vehs_collection');

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
                self.clans[clan._id].stats = new ClanStatsCollection();
                self.clans[clan._id].vehs = new ClanVehsCollection();
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
                if (self.clans[player.doc.c]){
                    var data = player.getData();
                    self.clans[player.doc.c].stats.addStats(data);
                    self.clans[player.doc.c].vehs.addVehs(data);
                }
            });

            callback(err);
        });
    },

    getData: function() {
        return _(this.clans).chain().values().sortBy('SC').map(function (clan) {
            return {
                wid: clan.wid,
                score: clan.SC,
                name: clan.name,
                tag: clan.tag,
                stats: clan.stats && clan.stats.getData(),
                vehs: clan.vehs && clan.vehs.getData()
            }
        }).value().reverse();
    }
});

ClanCollection.top = function(region, limit, callback) {
    var cond = region > -1 ? {_id: Regions.queryConditions(region)} : {};
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
