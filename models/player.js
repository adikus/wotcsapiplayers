var cls = require("./../lib/class");
var _ = require("underscore");
var DB = require("./../core/db");
var config = require("./../config");
var VehicleManager = require("./../services/veh_manager");
var StatsManager = require("./../services/stats_manager");
var Logger = require('./../core/logger');

module.exports = Player = cls.Class.extend({
    init: function (wid, doc, requestManager) {
        this.wid = wid;
        this.requestManager = requestManager;
        this.logger = new Logger('Player(' + wid + ')');

        this.doc = doc;
        if (this.doc) {
            this.afterFind();
        }
    },

    type: 'Player',

    afterFind: function () {
        this.vehicleManager = new VehicleManager(this);
        this.statsManager = new StatsManager(this);
    },

    find: function (callback) {
        var self = this;

        if (!this.doc || this.doc._id != this.wid) {
            DB.Player.findOne({_id: self.wid}, function (err, player) {
                if (!player) {
                    player = new DB.Player();
                    player._id = self.wid;
                }
                self.doc = player;

                self.afterFind();

                callback(err);
            });
        } else {
            this.afterFind();
            callback(null);
        }
    },

    findAndLoad: function (force, callback) {
        var self = this;

        this.find(function () {
            if (self.needsUpdate(force)) {
                self.requestManager.addReq(self.doc.c, 'accounts', self.wid, function (err, data) {
                    if (err) {
                        return callback(err, null);
                    }
                    if (!self.parseData(data)) {
                        self.logger.warning('Parse error');
                        return callback({message: "Parse error", id: self.wid}, null);
                    }
                    self.save();
                    callback(null, self.getData());
                });
            } else {
                callback(null, self.getData());
            }
        });
    },

    parseData: function (rawData) {
        var data = this.parseRawJSON(rawData);

        if (!data.player) {
            this.doc.s = '-1';
            this.doc.u = new Date();
            return true;
        }

        if(data.tanks)
            this.vehicleManager.parse(data.tanks);
        this.statsManager.parse(data.player.statistics.all).save();

        this.doc.n = data.player.nickname;
        this.doc.c = data.player.clan_id;
        this.doc.s = '1';
        this.doc.u = new Date();
        this.doc.l = new Date(Math.max(data.player.logout_at, data.player.last_battle_time) * 1000);
        this.doc.v = this.vehicleManager.getData();
        this.doc.sc = this.statsManager.getData();
        this.doc.markModified('v');
        this.doc.markModified('sc');

        return true;
    },

    parseRawJSON: function (rawData) {
        var data = {};
        try {
            data.player = JSON.parse(rawData.info).data[this.wid];
            data.tanks = JSON.parse(rawData.tanks).data[this.wid];
            return data;
        } catch (err) {
            this.logger.error(err.message);
            return false;
        }
    },

    save: function () {
        var self = this;

        this.doc.save(function (err) {
            if (err) {
                self.logger.error(err.message);
            }
        });
    },

    getData: function () {
        return {
            wid: this.doc._id,
            name: this.doc.n,
            clan_id: this.doc.c,
            updated_at: this.doc.u,
            logout_at: this.doc.l,
            vehs: this.vehicleManager.getBestFormatted(),
            stats_current: _.chain(this.doc.sc || {}).clone().tap(function (stats) {
                stats.updated_at = stats.u;
                delete stats.u;
            }).value()
        };
    },

    getUpdatedAt: function () {
        return (this.doc && this.doc.u) ? this.doc.u.getTime() : 0;
    },

    needsUpdate: function (force) {
        if (force < 0) {
            return false;
        }
        if(this.doc && (!this.doc.sc || !this.doc.sc.WN8)){
            return true;
        }
        if (force > 0) {
            return true;
        }
        return this.getUpdatedAt() < (new Date()).getTime() - config.player.updateInterval;
    }
});
