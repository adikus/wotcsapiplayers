var cls = require("./../lib/class"),
    _ = require("underscore"),
    Config = require("./../config"),
    DBTypes = require("./../core/db");

module.exports = JobManager = cls.Class.extend({
    updatePlayerStats: function (done_callback) {
        var o = {
                map: function () {
                    if (this.sc) {
                        var s = this.sc;
                        var GPL = Math.round(s.GPL / 200) * 200;
                        emit("GPL:" + GPL, 1);
                        var WIN = Math.round(s.WIN / s.GPL * 500) / 5;
                        emit("WIN:" + WIN, 1);
                        var SUR = Math.round(s.SUR / s.GPL * 500) / 5;
                        emit("SUR:" + SUR, 1);
                        var FRG = Math.round(s.FRG / s.GPL * 100) / 100;
                        emit("FRG:" + FRG, 1);
                        var KD = Math.round(s.FRG / (s.GPL - s.SUR) * 40) / 40;
                        emit("KD:" + KD, 1);
                        var SPT = Math.round(s.SPT / s.GPL * 50) / 50;
                        emit("SPT:" + SPT, 1);
                        var DMG = Math.round(s.DMG / s.GPL / 10) * 10;
                        emit("DMG:" + DMG, 1);
                        var CPT = Math.round(s.CPT / s.GPL * 25) / 25;
                        emit("CPT:" + CPT, 1);
                        var DPT = Math.round(s.DPT / s.GPL * 50) / 50;
                        emit("DPT:" + DPT, 1);
                        var EXP = Math.round(s.EXP / s.GPL / 5) * 5;
                        emit("EXP:" + EXP, 1);
                        var EFR = Math.round(s.EFR / 10) * 10;
                        emit("EFR:" + EFR, 1);
                        var WN7 = Math.round(s.WN7 / 10) * 10;
                        emit("WN7:" + WN7, 1);
                        var SC3 = Math.round(s.SC3 / 250) * 250;
                        emit("SC3:" + SC3, 1);
                    }
                },
                reduce: function (k, vals) {
                    var ret = 0;
                    for (i in vals) {
                        ret += vals[i];
                    }
                    return ret;
                },
                out: {replace: 'statistics'}
            },
            start = new Date();

        console.log("Updating player stats.");

        DBTypes.Player.mapReduce(o, function (err, results) {
            if (err)console.log(err);
            var end = new Date(),
                duration = end.getTime() - start.getTime();
            console.log("Player stats updated (" + duration + " ms).");
            done_callback();
        });
    },

    updateClanStats: function (done_callback) {
        var o = {
                query: DBTypes.Stat.find({SC: {$exists: true}}),
                map: function () {
                    if (this.s && this.s.d && this.s.d.member_count) {
                        var s = this.s,
                            i = s.d.u.length - 1,
                            mc = this.s.d.member_count[i];
                        var GPL = Math.round(s.d.GPL[i] / 20000) * 20000;
                        emit("GPL:" + GPL, 1);
                        var WIN = Math.round(s.d.WIN[i] / s.d.GPL[i] * 500) / 5;
                        emit("WIN:" + WIN, 1);
                        var SUR = Math.round(s.d.SUR[i] / s.d.GPL[i] * 500) / 5;
                        emit("SUR:" + SUR, 1);
                        var FRG = Math.round(s.d.FRG[i] / s.d.GPL[i] * 100) / 100;
                        emit("FRG:" + FRG, 1);
                        var KD = Math.round(s.d.FRG[i] / (s.d.GPL[i] - s.d.SUR[i]) * 40) / 40;
                        emit("KD:" + KD, 1);
                        var SPT = Math.round(s.d.SPT[i] / s.d.GPL[i] * 50) / 50;
                        emit("SPT:" + SPT, 1);
                        var DMG = Math.round(s.d.DMG[i] / s.d.GPL[i] / 10) * 10;
                        emit("DMG:" + DMG, 1);
                        var CPT = Math.round(s.d.CPT[i] / s.d.GPL[i] * 25) / 25;
                        emit("CPT:" + CPT, 1);
                        var DPT = Math.round(s.d.DPT[i] / s.d.GPL[i] * 50) / 50;
                        emit("DPT:" + DPT, 1);
                        var EXP = Math.round(s.d.EXP[i] / s.d.GPL[i] / 5) * 5;
                        emit("EXP:" + EXP, 1);
                        var EFR = Math.round(s.d.EFR[i] / 1000) * 1000;
                        emit("EFR:" + EFR, 1);
                        var WN7 = Math.round(s.d.WN7[i] / 1000) * 1000;
                        emit("WN7:" + WN7, 1);
                        var SC3 = Math.round(s.d.SC3[i] / 25000) * 25000;
                        emit("SC3:" + SC3, 1);
                        var EFRA = Math.round(s.d.EFR[i] / mc / 10) * 10;
                        emit("EFRA:" + EFRA, 1);
                        var WN7A = Math.round(s.d.WN7[i] / mc / 10) * 10;
                        emit("WN7A:" + WN7A, 1);
                        var SC3A = Math.round(s.d.SC3[i] / mc / 250) * 250;
                        emit("SC3A:" + SC3A, 1);
                        emit("MC:" + mc, 1);
                    }
                },
                reduce: function (k, vals) {
                    var ret = 0;
                    for (i in vals) {
                        ret += vals[i];
                    }
                    return ret;
                },
                out: {replace: 'cstatistics'}
            },
            start = new Date();

        console.log("Updating clan stats.");

        DBTypes.Stat.mapReduce(o, function (err, results) {
            if (err)console.log(err);
            var end = new Date(),
                duration = end.getTime() - start.getTime();
            console.log("Clan stats updated (" + duration + " ms).");
            done_callback();
        });
    },

    updateVehStats: function (done_callback) {
        var o = {
                scope: {},
                map: function () {
                    if (this.v) {
                        for (var i in this.v) {
                            var v = this.v[i],
                                name = v.v.replace('-', '__');
                            try {
                                var vData = eval(name);
                            } catch (err) {
                                var vData = false;
                            }
                            if (vData && (vData.l == 10)) {
                                var B = Math.round(v.b / 20) * 20;
                                emit(v.v + ":B:" + B, 1);
                                var W = Math.round(v.w / v.b * 250) / 2.5;
                                emit(v.v + ":W:" + W, 1);
                                if (this.sc) {
                                    var percentage = v.w / v.b * 100,
                                        factor = (percentage - 35) / 15 * Math.min(v.b, 75) / 75,
                                        S = Math.round(this.sc.WN7 / 1500 * (vData.l == 10 ? 1000 : 900) * factor / 25) * 25;
                                    emit(v.v + ":S:" + S, 1);
                                }
                            }
                        }
                    }
                },
                reduce: function (k, vals) {
                    var ret = 0;
                    for (i in vals) {
                        ret += vals[i];
                    }
                    return ret;
                },
                out: {replace: 'vstatistics'}
            },
            start = new Date();
        for (var i in VEHICLE_DATA) {
            var name = i.replace('-', '__');
            o.scope[name] = VEHICLE_DATA[i];
        }
        console.log("Updating vehicle stats.");

        DBTypes.Player.mapReduce(o, function (err, results) {
            if (err)console.log(err);
            var end = new Date(),
                duration = end.getTime() - start.getTime();
            console.log("Vehicle stats updated (" + duration + " ms).");
            done_callback();
        });
    },

    updateStatus: function (done_callback) {
        var times = [],
            start = new Date(),
            l = 13,
            testForEnd = function () {
                l--;
                if (l == 0) {
                    var end = new Date(),
                        duration = end.getTime() - start.getTime();
                    console.log("Status updated (" + duration + " ms).");
                    done_callback();
                }
            };

        console.log("Updating status.");

        for (var i = 1; i <= 12; i++) {
            var time = new Date();
            time.setTime(time.getTime() - i * 60 * 60 * 1000);
            times[i] = time;
        }

        DBTypes.PlayerStatus.remove(function () {
            _.each(times, function (time, key) {
                if (key > 0)
                    DBTypes.Player.count({u: {$gt: time}}, function (err, count) {
                        playerStatus = new DBTypes.PlayerStatus({_id: key, value: count});
                        playerStatus.save(function () {
                            testForEnd();
                        });
                    });
            });
        });

        DBTypes.Player.count({}, function (err, count) {
            playerStatus = new DBTypes.PlayerStatus({_id: 0, value: count});
            playerStatus.save(function () {
                testForEnd();
            });
        });
    },

    filterStats: function (time, skip, done, start) {
        var count = 0,
            self = this;

        DBTypes.Stat.find().skip(skip).limit(10000).exec(function (err, docs) {
            _.each(docs, function (doc) {
                var lastDate = doc.s.d.u[doc.s.d.u.length - 1];
                if (new Date(lastDate) < time) {
                    doc.remove();
                    self.deletedCount++;
                    count++;
                }
            });
            skip += 10000 - count;
            console.log('Deleting from stats', count, self.deletedCount, skip);
            if (skip < self.allCount)self.filterStats(time, skip, done, start);
            else {
                var end = new Date(),
                    duration = end.getTime() - start.getTime();
                console.log("Stats maintenance finnished (" + duration + " ms).");
                done();
            }
        });
    },

    statsMaintenance: function (done_callback) {
        var time = new Date(),
            self = this;
        this.deletedCount = 0;
        this.allCount = 9e99;

        console.log("Stats maintenance.");
        var start = new Date();

        DBTypes.Stat.count(function (err, count) {
            self.allCount = count;
            console.log('Count is: ' + count);
        });
        time.setTime(time.getTime() - (24 * 60 * 60 * 1000 * 14));

        this.filterStats(time, 0, done_callback, start);
    },

    updateVehStatsTest: function (done_callback) {
        var o = {
                scope: {},
                map: function () {
                    if (this.v) {
                        for (var i in this.v) {
                            var v = this.v[i];
                            var limit = new Date();
                            limit.setDate(limit.getDate() - 15);
                            if (v.v == 'IS-7' && v.b > 25 && this.u > limit) {
                                var B = Math.round(v.b / 20) * 20;
                                emit(v.v + ":B:" + B, 1);
                                var W = Math.round(v.w / v.b * 250) / 2.5;
                                emit(v.v + ":W:" + W, 1);
                                if (this.sc) {
                                    var percentage = v.w / v.b * 100,
                                        factor = (percentage - 35) / 15 * Math.min(v.b, 75) / 75,
                                        S = Math.round(this.sc.WN7 / 1500 * (1000) * factor / 25) * 25;
                                    emit(v.v + ":S:" + S, 1);
                                }
                            }
                        }
                    }
                },
                reduce: function (k, vals) {
                    var ret = 0;
                    for (i in vals) {
                        ret += vals[i];
                    }
                    return ret;
                },
                out: {replace: 'teststatistics'}
            },
            start = new Date();
        console.log("Updating vehicle test stats.");

        DBTypes.Player.mapReduce(o, function (err, results) {
            if (err)console.log(err);
            var end = new Date(),
                duration = end.getTime() - start.getTime();
            console.log("Vehicle test stats updated (" + duration + " ms).");
            done_callback();
        });
    },
});