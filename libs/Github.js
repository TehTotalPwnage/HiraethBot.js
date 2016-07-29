const githubhook = require('githubhook');

const Config = require('./Config');
const HiraethBot = require('./HiraethBot');

var github = githubhook();

github.listen();

github.on('push', function (repo, ref, data) {
	HiraethBot.Discord.sendMessage(Config.discord.announcementchannel.toString(), "**" + data.head_commit.author.name + " (" + data.head_commit.author.username +
		") pushed a new commit to " + data.repository.full_name + " (" + data.head_commit.message +
		"):** " + data.head_commit.url);
});