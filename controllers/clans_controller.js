var cls = require("./../lib/class");
var _ = require("underscore");
var DB = require('./../core/db');
var ClanLoader = require('./../services/clan_loader');
var StatsManager = require('./../services/stats_manager');
var config = require('./../config');

module.exports = ClansController = cls.Class.extend({
    init: function (app) {
        this.app = app;
        this.loaders = {};
    },

    show: function (req, callback) {
        var id = req.params.id;

        if (req.query.stats) {
            var statsManager = new StatsManager();
            return statsManager.getStatsFromDB(id, callback);
        }

        var force = req.query.force;
        var retry = req.query.retry;
        var last = req.query.last;

        var loader = this.prepareLoader(id, force, retry);
        loader.onReady(function () {
            callback(null, loader.getData(last));
        });
    },

    busyLoaders: function () {
        var ret = 0;
        _.each(this.loaders, function (loader) {
            ret += loader.l > 0 ? 1 : 0;
        });
        return ret;
    },

    prepareLoader: function (id, force, retry) {
        var loader = this.loaders[id];
        if (loader) {
            if (retry && loader.isDone()) {
                console.log('retry');
                loader.start(force);
            }
        } else {
            if (this.busyLoaders() >= config.loader.maxBusy) {
                force = -1;
            }
            loader = this.loaders[id] = new ClanLoader(id, this.app.requestManager);
            loader.start(force);

            var self = this;
            loader.onDelete(function () {
                console.log("Deleting loader for clan " + id);
                delete self.loaders[id];
            });
        }
        return loader;
    },

    index: function (req, callback) {
        var ret = {
                status: "ok",
                reqs_pending_total: 0,
                saves_pending_total: 0,
                speed: 0,
                average_req_time: 0,
                loaders: []
            },
            r = 0,
            s = 0,
            self = this;
        _.each(this.loaders, function (loader) {
            r += loader.reqsP;
            s += loader.savesP;
            ret.loaders.push({
                wid: loader.wid,
                created: loader.created,
                last_access: loader.lastAccessed,
                force: loader.force,
                last_pos: self.app.requestManager.pos(loader.lastWid, loader.wid),
                to_be_done: loader.l,
                reqs_pending: loader.reqsP,
                saves_pending: loader.savesP,
                error: loader.errors
            });
        });
        ret.speed = Math.round(this.app.requestManager.speed() * 100) / 100 + " req/s";
        ret.reqs_pending_total = r;
        ret.saves_pending_total = s;
        ret.average_req_time = Math.round(this.app.requestManager.getAverageTime() * 100) / 100 + " ms";
        ret.request_manager = {
            queues: this.app.requestManager.queueLengths(),
            current: this.app.requestManager.getCurrentReqs(),
            failed: this.app.requestManager.getFailedLength(),
            wait_time: Math.round(this.app.requestManager.waitTime)
        };
        callback(null, ret);
    },

    top: function (options) {
        var self = this,
            region = options["r"] ? parseInt(options["r"]) : -1,
            ret = {},
            addVehsToTotal = function (vehs, c) {
                if (!ret.clans[c].vehs) {
                    ret.clans[c].vehs = {};
                    for (var i = 1; i < 5; i++)if (!ret.clans[c].vehs[i])ret.clans[c].vehs[i] = [];
                }
                _.each(vehs, function (typeVehs, type) {
                    _.each(typeVehs.tanks, function (veh) {
                        if (veh.tier == 10) {
                            var found = false;
                            for (var i in ret.clans[c].vehs[type]) {
                                if (veh.name == ret.clans[c].vehs[type][i].name) {
                                    found = true;
                                    ret.clans[c].vehs[type][i].battles += veh.battles;
                                    ret.clans[c].vehs[type][i].wins += veh.wins;
                                    ret.clans[c].vehs[type][i].count++;
                                }
                            }
                            if (!found) {
                                ret.clans[c].vehs[type].push(_.clone(veh));
                                _.last(ret.clans[c].vehs[type]).count = 1;
                                delete _.last(ret.clans[c].vehs[type]).updated_at;
                            }
                        }
                    });
                });
            }, addStatsToTotal = function (stats, c) {
                if (!ret.clans[c].stats) {
                    ret.clans[c].stats = stats;
                    ret.clans[c].stats.member_count = 1;
                } else {
                    ret.clans[c].stats.GPL += stats.GPL;
                    ret.clans[c].stats.WIN += stats.WIN;
                    ret.clans[c].stats.DEF += stats.DEF;
                    ret.clans[c].stats.SUR += stats.SUR;
                    ret.clans[c].stats.FRG += stats.FRG;
                    ret.clans[c].stats.SPT += stats.SPT;
                    ret.clans[c].stats.ACR += stats.ACR;
                    ret.clans[c].stats.DMG += stats.DMG;
                    ret.clans[c].stats.CPT += stats.CPT;
                    ret.clans[c].stats.DPT += stats.DPT;
                    ret.clans[c].stats.EXP += stats.EXP;
                    ret.clans[c].stats.WN7 += stats.WN7;
                    ret.clans[c].stats.EFR += stats.EFR;
                    ret.clans[c].stats.SC3 += stats.SC3;
                    ret.clans[c].stats.member_count++;
                }
            };

        return function (callback) {
            var cond = {};
            switch (region) {
                case 0:
                    cond._id = {$lt: 500000000, $gt: 0};
                    break;
                case 1:
                    cond._id = {$lt: 1000000000, $gt: 500000000};
                    break;
                case 2:
                    cond._id = {$lt: 2000000000, $gt: 1000000000};
                    break;
                case 3:
                    cond._id = {$lt: 2500000000, $gt: 2000000000};
                    break;
                case 4:
                    cond._id = {$lt: 3000000000, $gt: 2500000000};
                    break;
                case 5:
                    cond._id = {$gt: 3000000000};
                    break;
            }

            DB.Stat.find(cond).select("_id SC").sort("-SC").limit(100).exec(function (err, docs) {
                var wids = _.map(docs, function (doc) {
                    return doc._id;
                });
                ret.clans = {};
                _.each(docs, function (clan) {
                    ret.clans[clan._id] = {SC: clan.SC};
                });
                DB.Player.find({c: {$in: wids}}, function (err, pdocs) {
                    ret.status = "ok";
                    var players = _.map(pdocs, function (doc) {
                        var p = new Player(doc._id);
                        p.doc = doc;
                        return p;
                    });
                    var clans = {};
                    _.each(players, function (player) {
                        if (!clans[player.doc.c])clans[player.doc.c] = {};
                        var data = player.getData();
                        addVehsToTotal(data.vehs, player.doc.c);
                        if (data.stats_current)addStatsToTotal(data.stats_current, player.doc.c);
                    });
                    var clans = ret.clans;
                    ret.clans = [];
                    DB.Clan.find({_id: {$in: wids}}).select("t n").exec(function (err, cdocs) {
                        _.each(cdocs, function (doc) {
                            clans[doc._id].name = doc.n;
                            clans[doc._id].tag = doc.t;
                        });

                        _.each(docs, function (clan) {
                            ret.clans.push({
                                wid: clan._id,
                                SC: clan.SC,
                                stats: clans[clan._id].stats,
                                vehs: clans[clan._id].vehs,
                                name: clans[clan._id].name,
                                tag: clans[clan._id].tag
                            });
                        });
                        callback(ret);
                    });
                });
            });
        }
    }
});
