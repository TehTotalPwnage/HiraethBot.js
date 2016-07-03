const config = require('./Config');
const PlugAPI = require('plugapi');
const Discord = require('./Discord');

var PlugBot = new PlugAPI({
	email: config.plug.email,
	password: config.plug.password
});
PlugBot.connect('tehtotalpwnage');

PlugBot.on('advance', function(media) {
	if (media.media) {
		Discord.Bot.setPlayingGame(media.media.author + " - " + media.media.title);
	} else {
		Discord.Bot.setPlayingGame(null);
	}
});