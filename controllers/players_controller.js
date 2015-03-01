var cls          = require("./../lib/class");
var _            = require("underscore");
var Player       = require('./../models/player');
var StatsManager = require('./../services/stats_manager');

module.exports = PlayersController = cls.Class.extend({
    init: function(app) {
        this.app = app;
    },

    show: function(req, callback) {
        var id = req.params.id;

        if(req.query.stats){
            var statsManager = new StatsManager();
            return statsManager.getStatsFromDB(id, callback);
        }

        var player = new Player(id, this.app.requestManager);
        player.findAndLoad(req.query.force || 0, callback);
    }
});
