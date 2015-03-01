var DB = require("./../core/db");
var _  = require("underscore");

module.exports = VehicleData = {
    ready: false,
    vehs: {},

    find: function(id) {
        return this.vehs[id];
    },

    load: function(callback){
        var self = this;

        DB.Vehicle.find(function(err, docs){
            self.vehs = docs[0].data;
            self.ready = true;
            callback();
        });
    }
};
