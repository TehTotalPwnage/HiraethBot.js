const HiraethBot = require('../HiraethBot');

var challenger, challenged, interval, rigged;
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
	rigged = null;
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
	challenger = message.author;
	challenged = message.mentions[0];
	if (challenged === HiraethBot.Discord.Bot.user) {
		HiraethBot.Discord.Bot.reply(message, "How about I rig the duel instead?").then(HiraethBot.Discord.postMessage);
		setTimeout(function() { duelCommence(HiraethBot.Discord.Bot.user, message.author, message); }, 5000);
	} else {
		request = true;
		HiraethBot.Discord.Bot.sendMessage(message.channel, challenged + ", " + message.author + 
			" has challenged you to a duel! Type !accept or !decline to respond. The loser gets muted for 1 minute!").then(HiraethBot.Discord.postMessage);
		interval = setInterval(function() {
			if (accepted === true) {
				clearInterval(interval);	
				request = accepted = false;
				HiraethBot.Discord.Bot.sendMessage(message.channel, "The duel will now commence! Good luck...").then(HiraethBot.Discord.postMessage);
				var chosenValue = Math.random();
				setTimeout(function() {
					if (rigged) {
						if (rigged === challenged) {
							duelCommence(challenged, message.author, message);
						} else {
							duelCommence(message.author, challenged, message);
						}
					} else if (chosenValue < 0.45) {
						duelCommence(message.author, challenged, message);
					} else if (chosenValue < 0.9) {
						duelCommence(challenged, message.author, message);
					} else {
						HiraethBot.Discord.Bot.sendMessage(message.channel, "And the winner is... there was **no winner**! " + 
							"...which means that **both players gets muted!** ANY LAST WORDS?!").then(HiraethBot.Discord.postMessage);
						setTimeout(function() {
							HiraethBot.Discord.Bot.sendMessage(message.channel, "**GET FUCKING NOSCOPED**").then(HiraethBot.Discord.postMessage);
							HiraethBot.Discord.Bot.muteMember(message.author, message.server);
							HiraethBot.Discord.Bot.deafenMember(message.author, message.server);
							console.log("[DUEL] Muted " + message.author.name);
							HiraethBot.Discord.Bot.muteMember(challenged, message.server);
							HiraethBot.Discord.Bot.deafenMember(challenged, message.server);
							console.log("[DUEL] Muted " + challenged.name);
							setTimeout(function () {
								HiraethBot.Discord.Bot.unmuteMember(message.author, message.server);
								HiraethBot.Discord.Bot.undeafenMember(message.author, message.server);
								HiraethBot.Discord.Bot.unmuteMember(challenged, message.server);
								HiraethBot.Discord.Bot.undeafenMember(challenged, message.server);
								HiraethBot.Discord.Bot.sendMessage(message.channel, "Anime bots can be pretty fucking savage.")
									.then(HiraethBot.Discord.postMessage);
								console.log("[DUEL] Unmuted " + message.author.name);
								console.log("[DUEL] Unmuted " + challenged.name);
							}, 60000);
						}, 5000);
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
	}
};

const rigduel = function(message) {
	if (message.author !== challenger && message.author !== challenged) {
		HiraethBot.Discord.Bot.reply(message, "You are not involved in the duel!").then(HiraethBot.Discord.postMessage);
	} else {
		rigged = message.author;
		HiraethBot.Discord.Bot.reply(message, "Duel rigged. You will win the next duel.").then(HiraethBot.Discord.postMessage);
	}
};

module.exports.accept = accept;
module.exports.duel = duel;
module.exports.rigduel = rigduel;