var DB = require("./../core/db");
var Logger = require("./../core/logger");
var _ = require("underscore");

var times = [];
var start = new Date();
var l = 13;

function testForEnd() {
    l--;
    if (l == 0) {
        var end = new Date();
        var duration = end.getTime() - start.getTime();
        Logger.info("Status updated (" + duration + " ms).");
        process.exit(1);
    }
}

Logger.info("Updating status.");

for (var i = 1; i <= 12; i++) {
    var time = new Date();
    time.setTime(time.getTime() - i * 60 * 60 * 1000);
    times[i] = time;
}

DB.PlayerStatus.remove(function () {
    _.each(times, function (time, key) {
        if (key > 0)
            DB.Player.count({u: {$gt: time}}, function (err, count) {
                var playerStatus = new DB.PlayerStatus({_id: key, value: count});
                playerStatus.save(function () {
                    testForEnd();
                });
            });
    });
});

DB.Player.count({}, function (err, count) {
    var playerStatus = new DB.PlayerStatus({_id: 0, value: count});
    playerStatus.save(function () {
        testForEnd();
    });
});
