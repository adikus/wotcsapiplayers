var cls = require("./../lib/class");
var _ = require("underscore");
var DB = require("./../core/db");
var config = require("./../config");
var StatsManager = require("./stats_manager");

module.exports = ClanLoader = cls.Class.extend({
    init: function (wid, requestManager) {
        this.lastAccessed = this.created = new Date();
        this.wid = parseInt(wid);
        this.requestManager = requestManager;
        this.reqsP = 0;
        this.savesP = 0;

        var self = this;
        this.deleteInterval = setInterval(function () {
            self.checkDelete();
        }, 1000);
    },

    onReady: function (callback) {
        var self = this;
        var waitTime = config.loader.waitTimeout;

        var interval = setInterval(function () {
            waitTime -= 100;
            if (self.isDone() || waitTime <= 0) {
                clearInterval(interval);
                callback();
            }
        }, 100);
    },

    checkDelete: function () {
        var now = new Date(),
            self = this,
            duration = now.getTime() - self.lastAccessed.getTime();

        if (duration > config.loader.deleteTimeout) {
            clearInterval(self.deleteInterval);
            self.delete_callback();
        }
    },

    start: function (force) {
        this.force = force;
        this.lastAccessed = new Date();

        this.players = [];
        this.done = false;
        this.l = 99999999;
        this.saved = false;

        this.errors = [];
        this.reqsP = 0;
        this.savesP = 0;
        this.lastWid = 0;

        this.total = {};

        var time = new Date(),
            self = this;
        time.setTime(time.getTime() - config.player.updateInterval);

        console.log("Starting loader for clan: " + this.wid);

        DB.Player.count({c: this.wid}, function (err, count) {
            self.l = count;

            if (self.l == 0)self.done = true;
            if (force !== true) {
                self.loadFromDB(time, force);
            }
            if (force !== -1) {
                self.loadFromWG(time, force);
            }
        });
    },

    loadFromDB: function (time, force) {
        var cond = {c: this.wid},
            self = this;

        if (force > -1) {
            cond.u = {$gt: time};
        }

        DB.Player.find(cond, function (err, docs) {

            var players = _.map(docs, function (doc) {
                var p = new Player(doc._id);
                p.doc = doc;
                return p;
            });
            _.each(players, function (player) {
                player.afterFind();
                self.player_data_callback(player.getData());
            });
        });
    },

    loadFromWG: function (time, force) {
        var cond = {c: this.wid, $or: [{u: {$exists: false}}, {u: {$lt: (force ? new Date() : time)}}]},
            self = this;
        DB.Player.find(cond, function (err, docs) {
            var players = _.map(docs, function (doc) {
                var p = new Player(doc._id, self.requestManager);
                p.doc = doc;
                return p;
            });
            _.each(players, function (player) {
                self.reqsP++;
                self.lastWid = player.wid;
                player.findAndLoad(1, function (err, data) {
                    if (err) {
                        self.handleError(err);
                        self.savesP++;
                    } else {
                        if (data.clan_id == self.wid) {
                            self.player_data_callback(data)
                        }
                    }
                });
            });
        });
    },

    player_data_callback: function (data) {
        data.saved_at = (new Date()).getTime();
        if (!this.total.stats_current) {
            this.total.stats_current = _.clone(data.stats_current);
            if (this.total.stats_current) {
                this.total.stats_current.member_count = 1;
            }
            else {
                var er = new DB.ErrorLog({e: "No stats\n" + data.wid, t: new Date()});
                er.save();
            }
            this.total.vehs = {};
            for (var i = 1; i < 5; i++)if (!this.total.vehs[i])this.total.vehs[i] = [];
        }
        else if (data.stats_current)this.addStatsToTotal(data.stats_current);
        this.addVehsToTotal(data.vehs);
        this.players.push(data);
        this.playerDone();
    },

    addStatsToTotal: function (stats) {
        this.total.stats_current.GPL += stats.GPL;
        this.total.stats_current.WIN += stats.WIN;
        this.total.stats_current.DEF += stats.DEF;
        this.total.stats_current.SUR += stats.SUR;
        this.total.stats_current.FRG += stats.FRG;
        this.total.stats_current.SPT += stats.SPT;
        this.total.stats_current.DMG += stats.DMG;
        this.total.stats_current.CPT += stats.CPT;
        this.total.stats_current.DPT += stats.DPT;
        this.total.stats_current.EXP += stats.EXP;
        this.total.stats_current.ACR = (parseFloat(stats.ACR) + parseFloat(this.total.stats_current.ACR)).toFixed(2);
        this.total.stats_current.WN7 = (parseFloat(stats.WN7) + parseFloat(this.total.stats_current.WN7)).toFixed(2);
        this.total.stats_current.EFR = (parseFloat(stats.EFR) + parseFloat(this.total.stats_current.EFR)).toFixed(2);
        this.total.stats_current.SC3 = (parseFloat(stats.SC3) + parseFloat(this.total.stats_current.SC3)).toFixed(2);
        this.total.stats_current.member_count++;
    },

    addVehsToTotal: function (vehs) {
        var self = this;
        _.each(vehs, function (typeVehs, type) {
            _.each(typeVehs.tanks, function (veh) {
                if (veh.tier == 10) {
                    var found = false;
                    for (var i in self.total.vehs[type]) {
                        if (veh.name == self.total.vehs[type][i].name) {
                            found = true;
                            self.total.vehs[type][i].battles += veh.battles;
                            self.total.vehs[type][i].wins += veh.wins;
                            self.total.vehs[type][i].count++;
                        }
                    }
                    if (!found) {
                        self.total.vehs[type].push(_.clone(veh));
                        _.last(self.total.vehs[type]).count = 1;
                        delete _.last(self.total.vehs[type]).updated_at;
                    }
                }
            });
        });
    },

    playerDone: function () {
        this.l--;
        if (this.l == 0)this.done = true;
    },

    handleError: function (err) {
        if (err)this.errors.push(err);
        this.playerDone();
    },

    isDone: function () {
        this.lastAccessed = new Date();
        return this.done;
    },

    onDelete: function (callback) {
        this.delete_callback = callback;
    },

    getData: function (last) {
        var ret = {members: []},
            saved_last = 0,
            last = last ? last : 0;

        _.each(this.players, function (player) {
            var time = new Date(player.saved_at);
            if (time.getTime() > last) {
                if (time.getTime() > saved_last)saved_last = time.getTime();
                ret.members.push(player);
            }
        });
        if (this.done) {
            if (this.total.stats_current) {
                this.total.stats_current.u = this.total.stats_current.updated_at = new Date();

                if (!this.saved) {
                    var sm = new StatsManager(this, this.total.stats_current);
                    sm.save();
                    this.saved = true;
                }
            }
            ret.total = this.total;
        }
        ret.status = "ok";
        ret.last = saved_last;
        ret.is_done = this.done;

        return ret;
    },

    setPlayerLoadFunction: function (callback) {
        this.loadPlayer = callback;
    }
});
