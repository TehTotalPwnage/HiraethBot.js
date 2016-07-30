const HiraethBot = require('../HiraethBot');

var run = false;

const shutdown = function(message) {
	if (run === false) {
		run = true;
		HiraethBot.Discord.Bot.sendMessage(message.channel, "Run !shutdown again to confirm.");
		setTimeout(function() {
			run = false;
		}, 10000);
	} else {
		HiraethBot.shutdown();
	}
};

module.exports = shutdown;