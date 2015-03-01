module.exports = routes = {
    '/': 'status#index',
    '/errors': 'status#errors',

    '/clans/top': 'clans#top',
    '/clans/loaders': 'clans#index',
    '/clans/:id': 'clans#show',

    '/players/:id': 'players#show',

    '/stats/vehs': 'stats#vehs',
    '/stats/players': 'stats#players',
    '/stats/clans': 'stats#clans'
};
