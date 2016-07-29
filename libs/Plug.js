const Config = require('./Config');
const HiraethBot = require('./HiraethBot');
const PlugAPI = require('plugapi');

var PlugBot = new PlugAPI({
	email: Config.plug.email,
	password: Config.plug.password
});
PlugBot.connect(Config.plug.mainroom);
module.exports = PlugBot;

var argsTrue = [];
var argsFalse = [ "!woot" ];

PlugBot.on('advance', function(media) {
	if (media.media) {
		HiraethBot.Discord.setPlayingGame(media.media.author + " - " + media.media.title);
	} else {
		HiraethBot.Discord.setPlayingGame(null);
	}
});
PlugBot.on('chat', function(data) {
	if (data.message.startsWith("!") && PlugBot.getSelf().role === 3) {
		var args = data.message.indexOf(" ");
		var param, value;
		if (args === -1) {
			param = data.message;
		} else {
			param = data.message.substr(0, data.message.indexOf(" "));
			value = data.message.substr(data.message.indexOf(" ") + 1);
		}
		if ((value === null || value === undefined) && argsTrue.indexOf(param) > -1) {
			PlugBot.sendChat("@" + data.raw.un + ", not enough arguments!", 10);
		} else if (value && argsFalse.indexOf(param) > -1) {
			PlugBot.sendChat("@" + data.raw.un + ", too many arguments!", 10);
		} else {
			if (param === "!meh") {
				PlugBot.meh();
				PlugBot.sendChat("This song is garbage!", 10);
			} else if (param === "!woot") {
				PlugBot.woot();
				PlugBot.sendChat("I love this song!", 10);
			}
		}
		PlugBot.moderateDeleteChat(data.id);
	} else if (data.raw.un !== "Hiraeth Music Bot" && PlugBot.getSelf().role === 3) {
		HiraethBot.Discord.sendMessage(Config.discord.relaychannel.toString(), "**[Plug.DJ] " + data.raw.un + ":** " + data.message);
	}
});