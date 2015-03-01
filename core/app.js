var cls = require("./../lib/class");
var Server = require('./server');
var Router = require("./router");
var config = require('./../config');
var _ = require("underscore");
var DB = require('./db');
var Logger = require('./logger');

var StatusController = require('./../controllers/status_controller');
var ClansController = require('./../controllers/clans_controller');
var PlayersController = require('./../controllers/players_controller');
var StatsController = require('./../controllers/stats_controller');

var RequestManager = require("./../services/req_manager");
var VehicleData = require('./../services/veh_data');

module.exports = App = cls.Class.extend({
    init: function () {
        this.router = new Router(this);
        this.server = new Server(config.server);
        this.server.setRouter(this.router);

        this.controllers = {
            status: new StatusController(this),
            clans: new ClansController(this),
            players: new PlayersController(this),
            stats: new StatsController(this)
        };

        this.requestManager = new RequestManager(config.loader);
    },

    run: function () {
        var self = this;

        Logger.info('Running application.');

        VehicleData.load(function () {
            self.server.run();
        });
    },

    logError: function (err) {
        Logger.error('Uncaught Exception: ' + err.message);
        Logger.error(err.stack);

        var errorLog = new DB.ErrorLog({e: err.stack, t: new Date()});
        errorLog.save(function () {
            process.exit(1);
        });
    }
});
