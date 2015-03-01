var DB = require("./../core/db");
var Logger = require("./../core/logger");
var _ = require("underscore");

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
                var WN8 = Math.round(s.WN8 / 10) * 10;
                emit("WN8:" + WN8, 1);
                var SC3 = Math.round(s.SC3 / 250) * 250;
                emit("SC3:" + SC3, 1);
            }
        },
        reduce: function (k, vals) {
            var ret = 0;
            for (var i in vals) {
                ret += vals[i];
            }
            return ret;
        },
        out: {replace: 'statistics'}
    };
var start = new Date();

Logger.info("Updating player stats.");

DB.Player.mapReduce(o, function (err, results) {
    if (err)Logger.error(err.message);
    var end = new Date();
    var duration = end.getTime() - start.getTime();
    Logger.info("Player stats updated (" + duration + " ms).");
    process.exit(1);
});
