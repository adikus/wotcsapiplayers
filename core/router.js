var express = require('express');
var cls = require("./../lib/class");
var _ = require("underscore");
var routes = require('./../routes');

module.exports = Router = cls.Class.extend({
    init: function (app) {
        this.app = app;
        this.routes = routes;

        var self = this;
        var router = express.Router();

        // Logging
        router.use(function (req, res, next) {
            console.log((new Date).toISOString(), req.method, req.path, req.query, req.connection.remoteAddress, req.headers.Referer || '(Direct)');
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
