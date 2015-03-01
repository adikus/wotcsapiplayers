var cls = require("./../lib/class");
var _ = require("underscore");
var DB = require("./../core/db");
var config = require("./../config");
var StatsManager = require("./stats_manager");
var Player = require("./../models/player");
var Logger = require('./../core/logger');
var ClanStatsCollection = require('./../models/clan_stats_collection');
var ClanVehsCollection = require('./../models/clan_vehs_collection');

module.exports = ClanLoader = cls.Class.extend({
    init: function (wid, requestManager) {
        this.wid = parseInt(wid);
        this.requestManager = requestManager;
        this.logger = new Logger('ClanLoader(' + wid + ')');

        this.lastAccessedAt = this.createdAt = new Date();

        this.pendingRequests = 0;

        var self = this;
        this.deleteInterval = setInterval(function () {
            self.checkDelete();
        }, 1000);
    },

    type: 'Clan',

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
        var self = this;
        var duration = (new Date()).getTime() - self.lastAccessedAt.getTime();

        if (duration > config.loader.deleteTimeout) {
            clearInterval(self.deleteInterval);
            self.delete_callback();
        }
    },

    getInfo: function () {
        return {
            wid: this.wid,
            created_at: this.createdAt,
            last_accessed_at: this.lastAccessedAt,
            force: this.force,
            last_pos: this.requestManager.pos(this.lastWid),
            to_be_done: this.toDo,
            reqs_pending: this.pendingRequests,
            error: this.errors
        }
    },

    initValues: function() {
        this.lastAccessedAt = new Date();
        this.players = [];
        this.done = false;
        this.saved = false;
        this.toDo = -1;
        this.errors = [];
        this.pendingRequests = 0;
        this.lastWid = 0;
        this.total = {
            stats: new ClanStatsCollection(),
            vehs: new ClanVehsCollection()
        };
    },

    start: function (force) {
        this.force = force || 0;
        this.initValues();

        var time = new Date();
        var self = this;
        time.setTime(time.getTime() - config.player.updateInterval);

        this.logger.info("Starting...");

        DB.Player.count({c: this.wid}, function (err, count) {
            self.toDo = count;

            if (self.toDo == 0){
                self.done = true;
                return;
            }
            if (self.force < 1) {
                self.loadFromDB(time, self.force);
            }
            if (self.force > -1) {
                self.loadFromWG(time, self.force);
            }
        });
    },

    loadFromDB: function (time, force) {
        var cond = {c: this.wid};
        var self = this;

        if (force > -1) {
            cond.u = {$gt: time};
        }

        DB.Player.find(cond, function (err, playerDocs) {
            var players = _.map(playerDocs, function (player) {
                return new Player(player._id, player);
            });
            _.each(players, function (player) {
                self.processPlayerData(player.getData());
            });
        });
    },

    loadFromWG: function (time, force) {
        var cond = {c: this.wid, $or: [{u: {$exists: false}}, {u: {$lt: (force ? new Date() : time)}}]};
        var self = this;
        DB.Player.find(cond, function (err, playerDocs) {
            var players = _.map(playerDocs, function (player) {
                return new Player(player._id, player, self.requestManager);
            });
            _.each(players, function (player) {
                self.pendingRequests++;
                self.lastWid = player.wid;
                player.findAndLoad(1, function (err, data) {
                    if (err) {
                        self.handleError(err);
                    } else {
                        if (data.clan_id == self.wid) {
                            self.processPlayerData(data)
                        }
                    }
                });
            });
        });
    },

    processPlayerData: function (data) {
        data.saved_at = (new Date()).getTime();

        this.total.stats.addStats(data);
        this.total.vehs.addVehs(data);
        this.players.push(data);
        this.playerDone();

        if (this.done && !this.saved) {
            var stats = _(this.total.stats.getData()).clone();
            stats.u = new Date();
            var sm = new StatsManager(this, stats);
            sm.save();
            this.saved = true;
        }
    },

    playerDone: function () {
        this.toDo--;
        if (this.toDo == 0)this.done = true;
    },

    handleError: function (err) {
        if (err)this.errors.push(err);
        this.playerDone();
    },

    isDone: function () {
        this.lastAccessedAt = new Date();
        return this.done;
    },

    onDelete: function (callback) {
        this.delete_callback = callback;
    },

    getData: function (last) {
        last = last || 0;
        var lastServed = 0;
        return {
            is_done: this.done,
            members: _(this.players).filter(function (player) {
                var time = new Date(player.saved_at);
                if (time.getTime() > last) {
                    if (time.getTime() > lastServed)lastServed = time.getTime();
                    return true;
                }
                return false;
            }),
            total: this.done ? { stats_current: this.total.stats.getData(), vehs: this.total.vehs.getData() } : undefined,
            last: lastServed
        };
    }
});
