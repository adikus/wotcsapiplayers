var DB = require("./../core/db");
var Logger = require("./../core/logger");
var _ = require("underscore");
var RequestManager = require("./../services/req_manager");
var config = require('./../config');

var requestManager = new RequestManager(config.loader);
var start = new Date();

Logger.info("Updating vehicle data.");

requestManager.addReq(false, 'encyclopedia.tanks', 500000001, function (err, rawData) {
    var data = JSON.parse(rawData);

    DB.Vehicle.findOne(function(err, vehData){
        vehData.data = data.data;
        vehData.save(function (err) {
            if (err)Logger.error(err.message);
            var end = new Date();
            var duration = end.getTime() - start.getTime();
            Logger.info("Vehicle data updated (" + duration + " ms).");
            process.exit(1);
        });
    });
});
