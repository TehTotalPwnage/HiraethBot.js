const Discord = require('./Discord');
const Github = require('./Github');
const Plug = require('./Plug');
const Reddit = require('./Reddit');

var shutdown = function() {
	console.log("Shutting down bot...");
	Plug.close();
	console.log("Plug.dj connection closed.");
	Discord.Bot.destroy();
	console.log("Discord connection closed.");
	Github.stop();
	console.log("Github webhook closed.");
	setTimeout(function() {
		process.exit();
	}, 5000);
};

module.exports.Discord = Discord;
module.exports.Plug = Plug;
module.exports.Reddit = Reddit;

module.exports.shutdown = shutdown;
