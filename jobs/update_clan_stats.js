var DB = require("./../core/db");
var Logger = require("./../core/logger");
var _ = require("underscore");

var o = {
        query: DB.Stat.find({SC: {$exists: true}}),
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
            for (var i in vals) {
                ret += vals[i];
            }
            return ret;
        },
        out: {replace: 'cstatistics'}
    };
var start = new Date();

Logger.info("Updating clan stats.");

DB.Stat.mapReduce(o, function (err, results) {
    if (err)Logger.error(err);
    var end = new Date();
    var duration = end.getTime() - start.getTime();
    Logger.info("Clan stats updated (" + duration + " ms).");
    process.exit(1);
});
