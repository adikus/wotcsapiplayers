var mongoose = require('mongoose');
var config = require("./../config");
var Logger = require('./logger');

var logger = new Logger('DB');

function connect(url, name) {
    return mongoose.createConnection(url, function (err) {
        if (err) {
            logger.error('Error connecting to ' + name);
            throw err;
        } else logger.info("Connected to " + name);
    });
}

var oldDB = connect(config.db.stats, 'Stats DB');
var playerDB = connect(config.db.players, 'Player DB');
var clanDB = connect(config.db.clans, 'Clan DB');

var ErrorSchema = mongoose.Schema({
    e: 'string',
    t: 'date'
});
var ErrorLog = oldDB.model('Perror', ErrorSchema);

var JobSchema = mongoose.Schema({
    j: 'string',
    t: 'date'
});
var Job = oldDB.model('Job', JobSchema);

var clanSchema = mongoose.Schema({
    _id: 'number',
    n: 'string',
    t: 'string',
    d: 'string',
    m: 'string',
    s: 'string',
    ms: 'mixed',
    u: 'date'
});
var Clan = clanDB.model('Clan', clanSchema);

var statSchema = mongoose.Schema({
    _id: 'number',
    s: 'mixed',
    SC: 'number',
});
var Stat = oldDB.model('Stat', statSchema);

var vehSchema = mongoose.Schema({
    name: {type: 'string', index: {unique: true, dropDups: true}},
    lname: 'string',
    tier: 'number',
    nation: 'number',
    type: 'number',
});
var VehDB = oldDB.model('Veh', vehSchema);

var vehicleSchema = mongoose.Schema({
    data: 'mixed',
    updated_at: 'date'
});
var VehicleDB = oldDB.model('Vehicle', vehicleSchema);

var statisticSchema = mongoose.Schema({
    _id: 'string',
    value: 'number'
});
var pvStatisticSchema = mongoose.Schema({
    _id: 'string',
    value: 'mixed'
});
var Statistic = playerDB.model('Statistic', statisticSchema);
var VStatistic = playerDB.model('VStatistic', statisticSchema);
var PVStatistic = playerDB.model('PVStatistic', pvStatisticSchema);
//var VStatistic = playerDB.model('TestStatistic', statisticSchema);
var CStatistic = oldDB.model('CStatistic', statisticSchema);

var playerStatusSchema = mongoose.Schema({
    _id: 'string',
    value: 'mixed'
});
var PlayerStatus = playerDB.model('PlayerStatus', playerStatusSchema, 'player_status');

var newPlayerSchema = mongoose.Schema({
    _id: 'number',
    n: 'string',
    s: 'string',
    c: 'number',
    sc: 'mixed',
    v: 'mixed',
    u: 'date',
    l: 'date'
});
var Player = playerDB.model('Player', newPlayerSchema);

module.exports = DB = {
    Clan: Clan,
    Veh: VehDB,
    Vehicle: VehicleDB,
    Player: Player,
    Stat: Stat,
    Statistic: Statistic,
    VStatistic: VStatistic,
    CStatistic: CStatistic,
    PVStatistic: PVStatistic,
    PlayerStatus: PlayerStatus,
    ErrorLog: ErrorLog,
    Job: Job
};
