const Discord = require("discord.js");

const Config = require('./Config');

var DiscordBot = new Discord.Client();
DiscordBot.login(Config.discord.token).then(token =>
	console.log("Logged into Discord with token : " + token));
module.exports.Bot = DiscordBot;

const HiraethBot = require('./HiraethBot');

const Duel = require('./commands/Duel');
const shutdown = require('./commands/Shutdown');

const argsFalse = {
	"accept": function(message) { Duel.accept(message); },
	"dab": function(message) { DiscordBot.sendMessage(message.channel, {file:{file: __dirname + "/../assets/images/60_21i.gif" }}); },
	"fiftyfifty": function(message) { HiraethBot.Reddit.getFiftyfifty(result => DiscordBot.sendMessage(message.channel, "**[" + message.author + "] [!fiftyfifty]** " + result)); },
	"ping": function(message) { DiscordBot.reply(message, "Pong!").then(message.delete(10000)); },
	"rigduel": function(message) { Duel.rigduel(message); },
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

DiscordBot.on("ready", () => {
	// DiscordBot.joinVoiceChannel(Config.discord.voicechannel)
	// 	.then(connection => {
	// 		connection.playFile(__dirname + '/../assets/audio/poi.mp3', {volume: 0.25});
	// 		console.log("Connected to voice channel " + connection.voiceChannel.name);
	// 	}).catch(console.log);
	// DiscordBot.sendMessage(Config.discord.relaychannel.toString(), "**Now poi-ing!**");
	console.log("Now serving " + DiscordBot.guilds.length + " servers.");
});

DiscordBot.on("message", (message) => {
	console.log("[CHAT]	[DISCORD] [" + message.author.name + "]: " + message.content);
	if (message.content.startsWith("!")) {
		var args = message.content.split(" ");
		var param, value;
		param = args[0].substr(1);
		if (args.length !== 1) {
			value = args[1];
		}
		if (!(param in argsFalse || param in argsTrue)) {
			DiscordBot.reply(message, "Unrecognized command. Run !help for a list of commands.").then(message.delete(10000));
		} else if ((value) && param in argsTrue) {
			argsTrue[param](message, value);
		} else if ((!value) && param in argsFalse ) {
			argsFalse[param](message);
		} else {
			DiscordBot.reply(message, "Incorrect number of arguments!").then(message.delete(10000));
		}
		DiscordBot.deleteMessage(message, { wait:5000 });
	} else if (HiraethBot.Plug.getSelf().role === 3 && message.author !== DiscordBot.user && message.channel === DiscordBot.channels.get("id", Config.discord.relaychannel)) {
		HiraethBot.Plug.sendChat("[Discord] " + message.author.name + ": " + message.content);
		console.log("[RELAY] [Plug.Dj]: [Discord] " + message.author.name + ": " + message.content);
	}
});
