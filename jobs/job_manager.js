var cls = require("./../lib/class");
var _ = require("underscore");
var DB = require("./../core/db");

// Old maintenance methods
module.exports = JobManager = cls.Class.extend({
    filterStats: function (time, skip, done, start) {
        var count = 0;
        var self = this;

        DB.Stat.find().skip(skip).limit(10000).exec(function (err, docs) {
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
                var end = new Date();
                var duration = end.getTime() - start.getTime();
                console.log("Stats maintenance finnished (" + duration + " ms).");
                done();
            }
        });
    },

    statsMaintenance: function (done_callback) {
        var time = new Date();
        var self = this;
        this.deletedCount = 0;
        this.allCount = 9e99;

        console.log("Stats maintenance.");
        var start = new Date();

        DB.Stat.count(function (err, count) {
            self.allCount = count;
            console.log('Count is: ' + count);
        });
        time.setTime(time.getTime() - (24 * 60 * 60 * 1000 * 14));

        this.filterStats(time, 0, done_callback, start);
    }
});
