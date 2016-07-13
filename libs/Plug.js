const HiraethBot = require('./HiraethBot');
const PlugAPI = require('plugapi');

var PlugBot = new PlugAPI({
	email: HiraethBot.config.plug.email,
	password: HiraethBot.config.plug.password
});
PlugBot.connect('tehtotalpwnage');
module.exports.Bot = PlugBot;

const Discord = require('./Discord');

var argsTrue = [];
var argsFalse = [ "!woot" ];

PlugBot.on('advance', function(media) {
	if (media.media) {
		Discord.Bot.setPlayingGame(media.media.author + " - " + media.media.title);
	} else {
		Discord.Bot.setPlayingGame(null);
	}
});
PlugBot.on('chat', function(data) {
	if (data.message.startsWith("!")) {
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
	} else if (data.raw.un !== "Hiraeth Music Bot") {
		Discord.Bot.sendMessage(Discord.Bot.channels.get("id", 183693578034216960), "**[Plug.DJ] " + data.raw.un + ":** " + data.message);
	}
});