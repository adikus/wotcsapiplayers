var cls = require("./../lib/class");
var _ = require("underscore");
var DB = require('./../core/db');

module.exports = StatsController = cls.Class.extend({
    players: function (req, callback) {
        this.getStats('Statistic', callback);
    },

    clans: function (req, callback) {
        this.getStats('CStatistic', callback);
    },

    vehs: function (req, callback) {
        this.getStats('VStatistic', callback, true);
    },

    getStats: function(tableName, callback, vehs) {
        DB[tableName].find(function (err, stats) {
            callback(err, _(stats).reduce(function (memo, stat) {
                var idParts = stat._id.split(":");

                var i = 0;
                if (vehs){ var veh = idParts[i++]; }
                var t = idParts[i++];
                var v = parseFloat(idParts[i++]);

                var key = vehs ? veh : t;

                if (!memo.stats[key]) {
                    memo.stats[key] = vehs ? {B: {}, W: {}, S: {}} : {};
                    memo.lengths[key] = vehs ? {B: 0, W: 0, S: 0} : 0;
                    memo.counts[key] = 0;
                }
                if(vehs){
                    memo.lengths[veh][t]++;
                    if (t == "B")memo.counts[veh] += stat.value;
                    memo.stats[veh][t][v] = stat.value;
                }else{
                    memo.lengths[t]++;
                    memo.counts[t] += stat.value;
                    memo.stats[t][v] = stat.value;
                }
                return memo;
            }, {lengths: {}, counts: {}, stats: {}}));
        });
    }
});
