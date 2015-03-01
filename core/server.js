var express  = require('express');
var _        = require("underscore");
var compress = require('compression');
var cls      = require("./../lib/class");
var Logger = require("./logger");

module.exports = server = cls.Class.extend({
	init: function(config) {
        this.config = config;
        this.app = express();
        this.app.use(compress());

        this.app.use(function (req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });
        this.app.set('json spaces', 2);
    },

    setRouter: function(router) {
        this.app.use('/', router.router);

        // Error handler needs to be defined after the routes
        this.app.use(function (err, req, res, next) {
            Logger.error('Internal Server Error: ' + err.message);
            Logger.error(err.stack);
            res.status(500).json({status: 'error', error: 'Internal Server Error'});
        });
    },

    run: function() {
        var self = this;
        this.server = this.app.listen(this.config.port, function () {
            var host = self.server.address().address;
            var port = self.server.address().port;

            Logger.info('Server listening at http://' + host + ':' + port)
        });
    }
});
