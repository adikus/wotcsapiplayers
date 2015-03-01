var DB = require("./../core/db");
var Logger = require("./../core/logger");
var _ = require("underscore");
var VehicleData = require('./../services/veh_data');


VehicleData.load(function () {
    var o = {
        scope: {vehs: VehicleData.vehs},
        map: function () {
            if (this.v) {
                for (var i in this.v) {
                    var v = this.v[i];
                    var id = v.t;
                    var vData = vehs[id];

                    if (vData && vData.level == 10) {
                        var B = Math.round(v.b / 20) * 20;
                        emit(id + ":B:" + B, 1);
                        var W = Math.round(v.w / v.b * 250) / 2.5;
                        emit(id + ":W:" + W, 1);
                        if (this.sc) {
                            var percentage = v.w / v.b * 100;
                            var factor = (percentage - 35) / 15 * Math.min(v.b, 75) / 75;
                            var base = vData.type == 'mediumTank' || vData.type == 'heavyTank' ? 1000 : 900;
                            var S = Math.round(this.sc.WN7 / 1500 * base * factor / 25) * 25;
                            emit(id + ":S:" + S, 1);
                        }
                    }
                }
            }
        },
        reduce: function (k, vals) {
            var ret = 0;
            for (var i in vals) {
                ret += vals[i];
            }
            return ret;
        },
        out: {replace: 'vstatistics'}
    };
    var start = new Date();

    Logger.info("Updating vehicle stats.");

    DB.Player.mapReduce(o, function (err, results) {
        if (err)Logger.error(err);
        var end = new Date();
        var duration = end.getTime() - start.getTime();
        Logger.info("Vehicle stats updated (" + duration + " ms).");
        process.exit(1);
    });
});
