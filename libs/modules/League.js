const lol = require('lol-js');

var lolClient = lol.client({
	cache: lol.redisCache({host: '127.0.0.1', port: 6379})
});

const getGame = function(name) {
	var id;
	lolClient.getSummonersByName('na', [name]).then(result => {
		lolClient.getRecentGamesForSummoner('na', result[name].id);
	});
};
