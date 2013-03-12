mongoose = require('mongoose');

var clanSchema = mongoose.Schema({ 
	name: 'string',
	tag: 'string',
	description: '',
	motto: 'string',
	wid: 'string',
	region: 'number',
	status: 'string',
	locked: 'number',
	members: 'mixed',
	updated_at: 'date'
});
var Clan = mongoose.model('Clan', clanSchema);
var vehSchema = mongoose.Schema({ 
	name: 'string',
	lname: 'string',
	tier: 'number',
	nation: 'number',
	type: 'number',
});
var VehDB = mongoose.model('Veh', vehSchema);

var plvehSchema = mongoose.Schema({
	veh: { type: mongoose.Schema.Types.ObjectId, ref: 'Veh' },
	player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
	battles: 'number',
	wins: 'number',
	updated_at: 'date'
});
var PlVeh = mongoose.model('Plveh', plvehSchema);

var clanStatsSchema = mongoose.Schema({ 
	_id: 'string',
	value: 'mixed'
});
var ClanStats = mongoose.model('ClanStats', clanStatsSchema, 'clan_stats');

var playerSchema = mongoose.Schema({
	wid: 'string',
	name: 'string',
	status: 'string',
	locked: 'number',
	clan_id: 'string',
	stats_current: 'mixed',
	updated_at: 'date'
});
var PlayerDB = mongoose.model('Player', playerSchema);

var statSchema = mongoose.Schema({ 
	GPL: 'number',
	WIN: 'number',
	DEF: 'number',
	SUR: 'number',
	FRG: 'number',
	SPT: 'number',
	ACR: 'number',
	DMG: 'number',
	CPT: 'number',
	DPT: 'number',
	EXP: 'number',	
	EFR: 'number',
	SCR: 'number',
	WN7: 'number',
	player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
	updated_at: 'date'
});
var Stat = mongoose.model('Stat', statSchema);

var clanListSchema = mongoose.Schema({ 
	wid: 'string',
	updated_at: 'date'
});
var ClanList = mongoose.model('ClanList', clanListSchema);

module.exports = DBTypes = {
	Clan: Clan,
	Veh: VehDB,
	PlVeh: PlVeh,
	Player: PlayerDB,
	Stat: Stat,
	ClanStats: ClanStats,
	ClanList: ClanList
};