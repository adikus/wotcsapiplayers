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
			"1:30:00": "updatePlayerStats",
			"1:40:00": "updateClanStats",
			"1:50:00": "updateVehStats",
		}
	},
	player: {
		updateInterval: 12*60*60*1000,	//12 hours
	},
};