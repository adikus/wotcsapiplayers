var cls = require("./../lib/class");
var _ = require("underscore");
var DB = require("./../core/db");
var config = require("./../config");
var VehicleManager = require("./../services/veh_manager");
var StatsManager = require("./../services/stats_manager");

module.exports = Player = cls.Class.extend({
    init: function (wid, requestManager) {
        this.wid = wid;
        this.requestManager = requestManager;
    },

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
                        return callback({message: "Parse error"}, null);
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
        if (!data) {
            return false;
        }

        this.vehicleManager.parse(data.tanks);
        this.statsManager.parse(data.player.statistics.all).save();

        this.doc.n = data.player.nickname;
        this.doc.s = '1';
        this.doc.u = new Date();
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
            console.log(err);
            return false;
        }
    },

    save: function () {
        this.doc.save(function (err) {
            if (err) {
                console.log("Error saving player: ", err);
            }
        });
    },

    getData: function () {
        return {
            wid: this.doc._id,
            name: this.doc.n,
            clan_id: this.doc.c,
            updated_at: this.doc.u,
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
        if (force > 0) {
            return true;
        }
        return this.getUpdatedAt() < (new Date()).getTime() - config.player.updateInterval;
    }
});
