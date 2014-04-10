var mongoose = require('mongoose'),
    Config = require("./config");

var oldDB = mongoose.createConnection(process.env.MONGOHQ_URL || Config.db.defHost,function(err){
	if (err){
		console.log("Error MONGOHQ DB", err);
		throw err;
	}else console.log("Connected to MONGOHQ DB");
});
var playerDB = mongoose.createConnection(process.env.WOTCS_PLAYERDB,function(err){
	if (err){
		console.log("Error MONGOLAB player DB", err);
		throw err;
	} else console.log("Connected to MONGOLAB player DB");
});
var clanDB = mongoose.createConnection(process.env.WOTCS_CLANDB,function(err){
	if (err){
		console.log("Error MONGOLAB clan DB", err);
		throw err;
	} else console.log("Connected to MONGOLAB clan DB");
});

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
	name: {type:'string',index: {unique: true, dropDups: true}},
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
var Statistic = playerDB.model('Statistic', statisticSchema);
var VStatistic = playerDB.model('VStatistic', statisticSchema);
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
	u: 'date'
});
var Player = playerDB.model('Player', newPlayerSchema);

module.exports = DBTypes = {
	Clan: Clan,
	Veh: VehDB,
    Vehicle: VehicleDB,
	Player: Player,
	Stat: Stat,
	Statistic: Statistic,
	VStatistic: VStatistic,
	CStatistic: CStatistic,
	PlayerStatus: PlayerStatus,
	ErrorLog: ErrorLog,
	Job: Job
};