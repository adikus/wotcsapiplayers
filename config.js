module.exports = Config = {
	server: {
		defPort: 3000,
	},
	db: {
		defHost: "mongodb://localhost/wotcsapi",
	},
	stats: {
		maxDays: 7,
		maxWeeks: 5,
	},
	loader: {
		simClans: 3,
		reqsPerClan: 3,
		reqsNoClan: 1,
		maxBusy: 9,
		deleteTimeout: 60*1000,  //1 minute
		waitTimeout: 1000,  //1 second
	},
	jobs: {
		periodical: {
			"600": "updateStatus", //10 minutes
		},
		timed: {
			"01:30:00": "updatePlayerStats",
			"01:40:00": "updateClanStats",
			"01:50:00": "updateVehStats",
		}
	},
	player: {
		updateInterval: 6*60*60*1000,	//6 hours
	},
};