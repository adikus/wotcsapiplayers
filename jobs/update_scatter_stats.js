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

                    if (vData && vData.level == 10 && this.sc) {
                        if(this.sc.GPL > 25){
                            var WIN = Math.round(this.sc.WIN / this.sc.GPL * 1000) / 10;
                            var W = Math.round(v.w / v.b * 1000) / 10;
                            var ret = {};
                            ret[W] = {};
                            ret[W][WIN] = 1;
                            emit(id, ret);
                        }
                    }
                }
            }
        },
        reduce: function (k, vals) {
            var ret = {};
            for (var i in vals) {
                var val = vals[i];
                for(var W in val){
                    if(!ret[W])ret[W] = {};
                    for(var WIN in val[W]){
                        if(!ret[W][WIN])ret[W][WIN] = 0;
                        ret[W][WIN] += val[W][WIN];
                    }
                }
            }
            return ret;
        },
        out: {replace: 'pvstatistics'}
    };
    var start = new Date();

    Logger.info("Updating scatter stats.");

    DB.Player.mapReduce(o, function (err, results) {
        if (err)Logger.error(err);
        var end = new Date();
        var duration = end.getTime() - start.getTime();
        Logger.info("Player-Vehicle scatter data updated (" + duration + " ms).");
        process.exit(1);
    });
});
