const config = require('./Config');
const Discord = require("discord.js");
const PlugAPI = require("plugapi");
const Reddit = require('./Reddit');

var DiscordBot = new Discord.Client();

const argsFalse = [ "!ping" ];
const argsTrue = [ "!duel", "!emojipasta" ];
var challenged, interval;
var duel = false;
var request = false;

function postMessage(message) {
	DiscordBot.deleteMessage(message, { wait:10000 });
}

function duelCommence(winner, loser, message) {
	DiscordBot.sendMessage(message.channel, "And the winner is... " + winner + 
		"! ...which means that " + loser + " gets muted! ANY LAST WORDS?!").then(postMessage);
	setTimeout(function() {
		DiscordBot.sendMessage(message.channel, loser + ", you were talking too much anyway.").then(postMessage);
		DiscordBot.muteMember(loser, message.server);
		DiscordBot.deafenMember(loser, message.server);
		setTimeout(function () {
			DiscordBot.unmuteMember(loser, message.server);
			DiscordBot.undeafenMember(loser, message.server);
			DiscordBot.sendMessage(message.channel, "Now " + loser + 
				"can reflect on how much better " + winner + " is at duels.").then(postMessage);
		}, 60000);
	}, 5000);
}

DiscordBot.on("message", function (message) {
	if (message.content.startsWith("!")) {
		// I would use message.split here but split is stupid in JS. Time for many useless lines.
		var args = message.content.indexOf(" ");
		var param, value;
		if (args === -1) {
			param = message.content;
		} else {
			param = message.content.substr(0, message.content.indexOf(" "));
			value = message.content.substr(message.content.indexOf(" ") + 1);
		}
		if ((value === null || value === undefined) && argsTrue.indexOf(param) > -1) {
			DiscordBot.reply(message, "Not enough arguments!").then(postMessage);
		} else if (value && argsFalse.indexOf(param) > -1) {
			DiscordBot.reply(message, "Too many arguments!").then(postMessage);
		} else {
			if (param === "!accept") {
				if (message.author === challenged) {
					duel = true;
				} else if (request === false) {
					DiscordBot.reply(message, "There is no active duel request.").then(postMessage);
				} else {
					DiscordBot.reply(message, "You are not the user that got challenged!").then(postMessage);
				}
			} else if (param === "!duel") {
				request = true;
				challenged = message.mentions[0];
				DiscordBot.sendMessage(message.channel, challenged + ", " + message.author + 
					" has challenged you to a duel! Type !accept or !decline to respond. The loser gets muted for 1 minute!").then(postMessage);
				interval = setInterval(function() {
					if (duel === true) {
						clearInterval(interval);	
						request = duel = false;
						DiscordBot.sendMessage(message.channel, "The duel will now commence! Good luck...").then(postMessage);
						var chosenValue = Math.random() < 0.5 ? true : false;
						setTimeout(function() {
							if (chosenValue) {
								duelCommence(message.author, challenged, message);
							} else {
								duelCommence(challenged, message.author, message);
							}
						}, 5000);
					}
				}, 1000);
				setTimeout(function() {
					if (request === true) {
						challenged = null;
						request = false;
						DiscordBot.reply(message, "Duel request cancelled due to timeout.").then(postMessage);
						clearInterval(interval);
					}
				}, 10000);
			} else if (param === "!emojipasta") {
				Reddit.getEmojipasta(value, result => DiscordBot.sendMessage(message.channel, result));
			} else if (param === "!fiftyfifty") {
				Reddit.getFiftyfifty(result => DiscordBot.sendMessage(message.channel, result));
			} else if (param === "!ping") {
				DiscordBot.reply(message, "Pong!").then(postMessage);
			} else if (param === "!polandball") {
				Reddit.getPolandball(value, result=> DiscordBot.sendMessage(message.channel, result));
			} else {
				DiscordBot.reply(message, "Unrecognized command. Run !help for a list of commands.").then(postMessage);
			}
		}
		DiscordBot.deleteMessage(message, { wait:5000 });
	}
});

DiscordBot.loginWithToken(config.discord.token).then(module.exports.DiscordBot = DiscordBot);

module.exports.Bot = DiscordBot;