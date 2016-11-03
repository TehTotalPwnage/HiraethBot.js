const Discord = require("discord.js");

const Config = require('./Config');

var DiscordBot = new Discord.Client();
DiscordBot.login(Config.discord.token).then(token =>
	console.log("Logged into Discord with token : " + token));
module.exports.Bot = DiscordBot;

const HiraethBot = require('./HiraethBot');

const Duel = require('./commands/Duel');
var player = require(__dirname + '/Player.js');
const shutdown = require('./commands/Shutdown');

const commands = {
	"accept": (message) => {
		Duel.accept(message);
	},
	"duel": function(message, value) {
		Duel.duel(message);
	},
	"emojipasta": function(message, value) {
		HiraethBot.Reddit.getEmojipasta(value, result => message.channel.sendMessage("**[" + message.author + "] [!emojipasta]** " + result));
	},
	"fiftyfifty": message => {
		HiraethBot.Reddit.getFiftyfifty(result => message.channel.sendMessage("**[" + message.author + "] [!fiftyfifty]** " + result));
	},
	"join": function(message, value) {
		HiraethBot.Plug.changeRoom(value);
		message.channel.sendMessage("**[" + message.author + "] [!join]** Joined Plug.dj room: " + value);
	},
	"ping": message => {
		message.reply("Pong!");
	},
	// "play": function(message, value) {
	// 	DiscordBot.voiceConnection.playFile(__dirname + '/../assets/audio/' + value + '.mp3', {volume: 0.25});
	// },
	"polandball": function(message, value) {
		HiraethBot.Reddit.getPolandball(value, result=> message.channel.sendMessage("**[" + message.author + "] [!polandball]** " + result));
	},
	"prune": (message) => {
		message.channel.fetchMessages().then(messages => {
			messages.deleteAll()
				.then(messages => console.log("Pruned " + messages.length + " messages from channel " + message.channel.name))
				.catch(error => console.log("Error on pruning messages from " + message.channel.name + ": " + error));
		});
	},
	"rigduel": message => {
		Duel.rigduel(message);
	},
	"setgame": message => {
		DiscordBot.user.setStatus("online", message.content.substring(9));
	},
	"shutdown": message => {
		shutdown(message);
	}
};

DiscordBot.on("ready", () => {
	console.log("Now serving " + DiscordBot.guilds.length + " servers.");
});

DiscordBot.on("message", message => {
	if (message.author.bot) {
		return;
	}
	if (message.content.startsWith("~")) {
		if (message.content.split(" ")[0].substring(1) in commands) {
	        commands[message.content.split(" ")[0].substring(1)](message);
	    } else if (message.content.split(" ")[0].substring(1) in player.commands) {
			player.commands[message.content.split(" ")[0].substring(1)](message);
		}
	} else if (message.author.id in player.response) {
		player.response[message.author.id].push(message.content);
		player.response[message.author.id][0] = true;
	}
});
