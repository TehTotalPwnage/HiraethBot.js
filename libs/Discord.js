const Discord = require("discord.js");

const Config = require('./Config');

var DiscordBot = new Discord.Client({
	autoReconnect: true
});
DiscordBot.loginWithToken(Config.discord.token).then(token => console.log("Logged into Discord with token : " + token));
const postMessage = function(message) {
	DiscordBot.deleteMessage(message, { wait:10000 });
};
module.exports.Bot = DiscordBot;
module.exports.postMessage = postMessage;

// Load dependents.
const HiraethBot = require('./HiraethBot');

// Load command files.
const Duel = require('./commands/Duel');
const shutdown = require('./commands/Shutdown');

//const argsFalse = [ "!ping", "!shutdown" ];
//const argsTrue = [ "!duel", "!emojipasta", "!join", "!play" ];

const argsFalse = {
	"accept": function(message) { Duel.accept(message); },
	"dab": function(message) { DiscordBot.sendMessage(message.channel, {file:{file: __dirname + "/../assets/images/60_21i.gif" }}); },
	"fiftyfifty": function(message) { HiraethBot.Reddit.getFiftyfifty(result => DiscordBot.sendMessage(message.channel, "**[" + message.author + "] [!fiftyfifty]** " + result)); },
	"ping": function(message) { DiscordBot.reply(message, "Pong!").then(postMessage); },
	"shutdown": function(message) { shutdown(message); }
};

const argsTrue = {
	"duel": function(message, value) { Duel.duel(message); },
	"emojipasta": function(message, value) { HiraethBot.Reddit.getEmojipasta(value, result => DiscordBot.sendMessage(message.channel, "**[" + message.author + "] [!emojipasta]** " + result)); },
	"join": function(message, value) {
		HiraethBot.Plug.changeRoom(value);
		DiscordBot.sendMessage(message.channel, "**[" + message.author + "] [!join]** Joined Plug.dj room: " + value); },
	"play": function(message, value) { DiscordBot.voiceConnection.playFile(__dirname + '/../assets/audio/' + value + '.mp3', {volume: 0.25}); },
	"polandball": function(message, value) { HiraethBot.Reddit.getPolandball(value, result=> DiscordBot.sendMessage(message.channel, "**[" + message.author + "] [!polandball]** " + result)); }
};

DiscordBot.on("ready", function () {
	DiscordBot.joinVoiceChannel(Config.discord.voicechannel)
		.then(connection => {
			connection.playFile(__dirname + '/../assets/audio/poi.mp3', {volume: 0.25});
			console.log("Connected to voice channel " + connection.voiceChannel.name);
		}).catch(console.log);
	DiscordBot.sendMessage(Config.discord.relaychannel.toString(), "**Now poi-ing!**");
});

DiscordBot.on("message", function (message) {
	console.log("[CHAT]	[DISCORD] [" + message.author.name + "]: " + message.content);
	if (message.content.startsWith("!")) {
		var args = message.content.indexOf(" ");
		var param, value;
		if (args === -1) {
			param = message.content.substr(1);
		} else {
			param = message.content.substr(1, message.content.indexOf(" ") - 1);
			value = message.content.substr(message.content.indexOf(" ") + 1);
		}
		if (!(param in argsFalse || param in argsTrue)) {
			DiscordBot.reply(message, "Unrecognized command. Run !help for a list of commands.").then(postMessage);
		} else if ((value) && param in argsTrue) {
			argsTrue[param](message, value);
		} else if ((!value) && param in argsFalse ) {
			argsFalse[param](message);
		} else {
			DiscordBot.reply(message, "Incorrect number of arguments!").then(postMessage);
		}
		DiscordBot.deleteMessage(message, { wait:5000 });
	} else if (HiraethBot.Plug.getSelf().role === 3 && message.author !== DiscordBot.user && message.channel === DiscordBot.channels.get("id", Config.discord.relaychannel)) {
		HiraethBot.Plug.sendChat("[Discord] " + message.author.name + ": " + message.content);
		console.log("[RELAY] [Plug.Dj]: [Discord] " + message.author.name + ": " + message.content);
	}
});