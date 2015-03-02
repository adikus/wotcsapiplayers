module.exports = config = {
    server: {
        port: process.env.PORT || 3000
    },
    db: {
        stats: process.env.MONGOHQ_URL || "mongodb://localhost/wotcsapi",
        players: process.env.WOTCS_PLAYERDB || "mongodb://localhost/wotcsapiplayers",
        clans: process.env.WOTCS_CLANDB || "mongodb://localhost/wotcsapiclans"
    },
    stats: {
        maxDays: 7,
        maxWeeks: 5
    },
    loader: {
        simultaneousRequests: 4,
        waitTime: 650,
        waitMultiplier: 1.05,
        idsInOneRequest: 30,
        maxBusy: 50,
        deleteTimeout: 60 * 1000,  //1 minute
        waitTimeout: 1000  //1 second
    },
    player: {
        updateInterval: 6 * 60 * 60 * 1000   //6 hours
    },
    logger: {
        logLevel: process.env.LOG_LEVEL || 0
    },
    vehData: {
        reloadInterval: 60 * 60 * 1000   //1 hour
    }
};
