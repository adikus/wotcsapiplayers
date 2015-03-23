var DB = require("./../core/db");
var _  = require("underscore");
var Logger = require('./../core/logger');
var config = require("./../config");
var expectedValues = require("./../wn8/expected_tank_values");

module.exports = VehicleData = {
    vehs: {},
    loading: false,

    find: function(id) {
        if(this.needsReload()){
            this.load(function () {
                Logger.info('Vehicle data reloaded');
            });
        }

        return this.vehs[id];
    },

    needsReload: function() {
        return !this.loading && (!this.loadedAt || this.loadedAt.getTime() < (new Date()).getTime() - config.vehData.reloadInterval)
    },

    load: function(callback){
        var self = this;
        self.loading = true;

        DB.Vehicle.findOne(function(err, vehData){
            self.vehs = vehData.data;

            self.loadExpectedValues(function(){
                self.loading = false;
                self.loadedAt = new Date();
                callback();
            });
        });
    },

    loadExpectedValues: function(callback) {
        _(expectedValues.data).each(function (row) {
            var veh = this.find(row.IDNum);
            if(veh){
                veh.expected = row;
            }
        }, this);

        _(this.ExpectedValuesMap).each(function(id, newId) {
            var veh = this.find(newId);
            if(veh){
                veh.expected = this.find(id).expected;
            }
        }, this);

        callback();
    },

    ExpectedValuesMap: {
        38737: 5969,
        38753: 2657,
        38961: 2865,
        39009: 1121,
        39249: 1105,
        39489: 2113,
        39505: 11857,
        39745: 51985,
        39761: 8529,
        39937: 2305,
        39953: 55569,
        39969: 5921,
        40001: 14145,
        40017: 2897,
        40193: 53249,
        40209: 1297,
        40225: 3873,
        40449: 52481,
        40465: 7697,
        40481: 1057
    }
};
