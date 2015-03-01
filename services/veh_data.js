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
        callback();
    }
};
