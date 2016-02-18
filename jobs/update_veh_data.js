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
                    addStatic(vehData);
                    callback();
                });
            });
        });
    });
}

function addStatic(vehData) {
    vehData.data[63505] = {
        nation_i18n: 'Germany',
        name: 'G117_Toldi_III',
        level: 3,
        image: 'http://api.worldoftanks.eu/static/2.36.0/wot/encyclopedia/vehicle/germany-G117_Toldi_III.png',
        image_small: 'http://api.worldoftanks.eu/static/2.36.0/wot/encyclopedia/vehicle/small/germany-G117_Toldi_III.png',
        nation: 'germany',
        is_premium: true,
        type_i18n: 'Light Tank',
        contour_image: 'http://api.worldoftanks.eu/static/2.36.0/wot/encyclopedia/vehicle/contour/germany-G117_Toldi_III.png',
        short_name_i18n: 'Toldi III',
        name_i18n: '43 M. Toldi III',
        type: 'lightTank',
        tank_id: 63505
    };
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
