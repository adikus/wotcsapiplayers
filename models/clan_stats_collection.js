var cls = require("./../lib/class");
var _ = require("underscore");
var StatsManager = require("./../services/stats_manager");

module.exports = ClanStatsCollection = cls.Class.extend({
    init: function () {
        this.stats = _(StatsManager.stats).chain().map(function (stat) {
            return [stat, 0]
        }).object().value();
        this.stats.member_count = 0;
    },

    addStats: function (data) {
        var stats = data.stats_current;

        _(StatsManager.stats).each(function (key) {
            if(!stats[key] || isNaN(stats[key]))return;
            if(_(stats[key]).isString()){
                this.stats[key] = (parseFloat(this.stats[key]) + parseFloat(stats[key])).toFixed(2);
            }else{
                this.stats[key] += stats[key];
            }
        }, this);
        this.stats.member_count++;
    },

    getData: function() {
        return this.stats;
    }
});
