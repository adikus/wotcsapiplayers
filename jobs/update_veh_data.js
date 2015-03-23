var DB = require("./../core/db");
var Logger = require("./../core/logger");
var _ = require("underscore");
var RequestManager = require("./../services/req_manager");
var config = require('./../config');
var Regions = require('./../shared/regions');

var requestManager = new RequestManager(config.loader);
var start = new Date();

Logger.info("Updating vehicle data.");

loadTankopedia(1, function(data) {
    DB.Vehicle.findOne(function(err, vehData){
        vehData.data = data.data;

        loadOtherNations(vehData, function() {
            vehData.updated_at = new Date();
            vehData.markModified('data');

            vehData.save(function (err) {
                if (err)Logger.error(err.message);

                var end = new Date();
                var duration = end.getTime() - start.getTime();
                Logger.info("Vehicle data updated (" + duration + " ms).");
                process.exit(1);
            });
        });
    });
});

function loadOtherNations(vehData, callback) {
    loadTankopedia(0, function(data) {
        addFromRegion(0, vehData, data);
        loadTankopedia(2, function(data) {
            addFromRegion(2, vehData, data);
            loadTankopedia(3, function(data) {
                addFromRegion(3, vehData, data);
                loadTankopedia(5, function(data) {
                    addFromRegion(5, vehData, data);
                        callback();
                });
            });
        });
    });
}

function addFromRegion(region, vehData, data) {
    _(data.data).each(function(tank, id) {
        if(!vehData.data[id]){
            vehData.data[id] = tank;
            Logger.info("Adding " + tank.name_i18n + "(" + tank.tank_id + ")" + " from " + Regions.TranslatedRegion[region]);
        }
    });
}

function loadTankopedia(region, callback) {
    var id = Regions.bounds[region].min + 1;
    requestManager.addReq(false, 'encyclopedia.tanks', id, function (err, rawData) {
        Logger.info('Tankopedia for region ' + Regions.TranslatedRegion[region] + ' loaded');
        callback(JSON.parse(rawData));
    });
}
