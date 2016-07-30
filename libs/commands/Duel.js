const HiraethBot = require('../HiraethBot');

var challenged, interval;
var accepted, request = false;

const accept = function(message) {
	if (message.author === challenged) {
		accepted = true;
	} else if (request === false) {
		HiraethBot.Discord.Bot.reply(message, "There is no active duel request.").then(HiraethBot.Discord.postMessage);
	} else {
		HiraethBot.Discord.Bot.reply(message, "You are not the user that got challenged!").then(HiraethBot.Discord.postMessage);
	}
};

function duelCommence(winner, loser, message) {
	HiraethBot.Discord.Bot.sendMessage(message.channel, "And the winner is... " + winner + 
		"! ...which means that " + loser + " gets muted! ANY LAST WORDS?!").then(HiraethBot.Discord.postMessage);
	setTimeout(function() {
		HiraethBot.Discord.Bot.sendMessage(message.channel, loser + ", you were talking too much anyway.").then(HiraethBot.Discord.postMessage);
		HiraethBot.Discord.Bot.muteMember(loser, message.server);
		HiraethBot.Discord.Bot.deafenMember(loser, message.server);
		console.log("[DUEL] Muted " + loser.name);
		setTimeout(function () {
			HiraethBot.Discord.Bot.unmuteMember(loser, message.server);
			HiraethBot.Discord.Bot.undeafenMember(loser, message.server);
			HiraethBot.Discord.Bot.sendMessage(message.channel, "Now " + loser + 
				" can reflect on how much better " + winner + " is at duels.").then(HiraethBot.Discord.postMessage);
			console.log("[DUEL] Unmuted " + loser.name);
		}, 60000);
	}, 5000);
}

const duel = function(message) {
	request = true;
	challenged = message.mentions[0];
	HiraethBot.Discord.Bot.sendMessage(message.channel, challenged + ", " + message.author + 
		" has challenged you to a duel! Type !accept or !decline to respond. The loser gets muted for 1 minute!").then(HiraethBot.Discord.postMessage);
	interval = setInterval(function() {
		if (accepted === true) {
			clearInterval(interval);	
			request = accepted = false;
			HiraethBot.Discord.Bot.sendMessage(message.channel, "The duel will now commence! Good luck...").then(HiraethBot.Discord.postMessage);
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
			HiraethBot.Discord.Bot.reply(message, "Duel request cancelled due to timeout.").then(HiraethBot.Discord.postMessage);
			clearInterval(interval);
		}
	}, 20000);
};

module.exports.accept = accept;
module.exports.duel = duel;