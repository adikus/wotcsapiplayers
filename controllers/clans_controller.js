var cls = require("./../lib/class");
var _ = require("underscore");
var ClanLoader = require('./../services/clan_loader');
var StatsManager = require('./../services/stats_manager');
var config = require('./../config');
var ClanCollection = require('./../models/clan_collection');
var Logger = require('./../core/logger');

module.exports = ClansController = cls.Class.extend({
    init: function (app) {
        this.app = app;
        this.loaders = {};
        this.logger = new Logger('ClansController');
    },

    index: function (req, callback) {
        callback(null, {
            loaders: _(this.loaders).map(function (loader) {
                return loader.getInfo();
            }),
            reqs_pending_total: _(this.loaders).reduce(function (memo, loader) {
                return memo + loader.pendingRequests;
            }, 0),
            request_manager: this.app.requestManager.getInfo()
        });
    },

    show: function (req, callback) {
        var id = req.params.id;

        if (req.query.stats) {
            var statsManager = new StatsManager();
            return statsManager.getStatsFromDB(id, callback);
        }

        var force = req.query.force;
        var retry = req.query.retry;
        var last = req.query.last;

        var loader = this.prepareLoader(id, force, retry);
        loader.onReady(function () {
            callback(null, loader.getData(last));
        });
    },

    top: function (req, callback) {
        var region = req.query.region ? parseInt(req.query.region, 10) : -1;

        ClanCollection.top(region, 100, callback);
    },

    busyLoaders: function () {
        var ret = 0;
        _.each(this.loaders, function (loader) {
            ret += loader.toDo == 0 ? 0 : 1;
        });
        return ret;
    },

    prepareLoader: function (id, force, retry) {
        var loader = this.loaders[id];
        if (loader) {
            if (retry && loader.isDone()) {
                this.logger.info('Retry loader for clan ' + id);
                loader.start(force);
            }
        } else {
            if (this.busyLoaders() >= config.loader.maxBusy) {
                force = -1;
            }
            this.logger.info('Creating loader for clan ' + id);
            loader = this.loaders[id] = new ClanLoader(id, this.app.requestManager);
            loader.start(force);

            var self = this;
            loader.onDelete(function () {
                self.logger.info('Deleting loader for clan ' + id);
                delete self.loaders[id];
            });
        }
        return loader;
    }
});
