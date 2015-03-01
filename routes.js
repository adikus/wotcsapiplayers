module.exports = routes = {
    '/': 'status#index',
    '/errors': 'status#errors',

    '/clans/top': 'clans#top',
    '/clans/loaders': 'clans#index',
    '/clans/:id': 'clans#show',
    '/clans/:id/stats': 'clans#stats',

    '/players/:id': 'players#show',
    '/players/:id/stats': 'players#stats',

    '/stats/vehs': 'stats#vehs',
    '/stats/players': 'stats#players',
    '/stats/clans': 'stats#clans'
};
