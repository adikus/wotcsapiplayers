var express = require('express');
var cls = require("./../lib/class");
var _ = require("underscore");
var routes = require('./../routes');
var Logger = require("./logger");

module.exports = Router = cls.Class.extend({
    init: function (app) {
        this.app = app;
        this.routes = routes;
        this.logger = new Logger('Router');

        var self = this;
        var router = express.Router();

        // Logging
        router.use(function (req, res, next) {
            var method = req.method;
            var path = req.path;
            var query = JSON.stringify(req.query);
            var ip = req.connection.remoteAddress;
            var referer = req.headers.Referer || '(Direct)';

            self.logger.info(method + ' ' + path + ' ' + query + ' ' + ip + ' ' + referer);
            next();
        });

        _(this.routes).each(function (target, route) {
            var path = target.split('#');
            var controller = path[0];
            var method = path[1];

            router.get(route, function (req, res) {
                self.app.controllers[controller][method](req, function (err, data) {
                    if (err) {
                        res.status(err.httpStatus || 500).json({status: 'error', error: err.message});
                    } else {
                        res.json({status: 'ok', data: data});
                    }
                });
            });
        });

        // Missing route handler
        router.get('*', function (req, res) {
            res.json({status: 'error', error: "Method doesn't exist"});
        });

        this.router = router;
    }
});
