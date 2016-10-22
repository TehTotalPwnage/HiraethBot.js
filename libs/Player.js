const events = require("events");
const sqlite = require("sqlite");
const youtubeapi = require("youtube-api");
const youtubedl = require("youtube-dl");

class Player extends events.EventEmitter {
	constructor() {
		super();

		this.autoplaylist = [];
		this.connection = null;
		this.members = 0;
		this.persistence = false;
		this.playing = false;
		this.queue = [];
		this.stream = null;
		this.voiceChannel = null;

		this.addAutoplaylist = url => {
			return new Promise((fulfill, reject) => {
				youtubedl.getInfo(url, [], (err, info) => {
					if (err) {
						reject("An error occured. You might've forgotten to use a URL for the query.");
					} else {
						let title = info.title;
						let length = this.queue.push(url);
						if (info.title.length > 50) title = info.title.substring(0, 47) + "... ";
						else if (info.title.length < 50) title = info.title + ' '.repeat(50 - info.title.length) + ' ';
						else title = info.title + ' ';
						sqlite.open(`${__dirname}/../data.sqlite3`).then(() => {
							sqlite.prepare("INSERT INTO Autoplaylist (URL, Title, ID) VALUES (?, ?, ?)").then(stmt => {
								stmt.run(url, title, info.id).then(this.reloadPlaylist);
							});
				        });
						fulfill(`Added ${info.title} to the autoplaylist.`);
					}
				});
			});
		};
		this.connect = voiceChannel => {
			this.voiceChannel = voiceChannel;
			this.voiceChannel.join().then(newConn => this.connection = newConn);
			this.getUsers();
		};
		this.getUsers = () => {
			this.members = this.voiceChannel.members.array().length;
		};
		this.push = (obj, repeat, search) => {
			return new Promise(fulfill => {
				let query = search ? "ytsearch:" + obj : obj;
				youtubedl.getInfo(query, [], (err, info) => {
					if (err) {
						this.push(obj, repeat, true).then(fulfill);
					} else {
						let title = info.title;
						let length = this.queue.push(new Video(obj, {"repeat": repeat}));
						if (info.title.length > 50) title = info.title.substring(0, 47) + "... ";
						else if (info.title.length < 50) title = info.title + ' '.repeat(50 - info.title.length) + ' ';
						else title = info.title + ' ';
						this.queue[length - 1].title = title;
						this.queue[length - 1].id = info.id + " ";
						if (!this.playing) {
							this.voiceChannel.join().then(newConn => {
								this.connection = newConn;
								this.play(this.queue[0]);
							});
						}
						fulfill(info.title);
					}
				});
			});
		};
		this.play = (song, search) => {
			this.playing = true;
			let video = search ? youtubedl("ytsearch:" + song.query, ['-f bestaudio/best']) : youtubedl(song.query, ['-f bestaudio/best']);
			video.on('error', () => {
				console.log("There was an error loading the long, likely due to a search. Retrying...");
				this.play(song, true);
			});
			video.on('info', () => {
				console.log("Song fetched! Now playing...");
				this.stream = this.connection.playStream(video);
				this.stream.setVolume(0.5);
				this.stream.on('end', () => {
					this.playing = false;
					if (song.repeat) {
						this.play(song);
					} else {
						this.queue.splice(0, 1);
						if (this.queue[0]) {
							this.play(this.queue[0]);
						} else if (this.persistence) {
							this.push(this.autoplaylist[Math.floor(Math.random() * this.autoplaylist.length)].url);
						} else {
							this.voiceChannel.leave();
						}
					}
				});
			});
		};
		this.reloadPlaylist = () => {
			sqlite.open(`${__dirname}/../data.sqlite3`).then(() => {
				sqlite.all("SELECT URL, Title, ID FROM Autoplaylist").then(rows => {
					for (let i = 0; i < rows.length; i++) {
						this.autoplaylist.push({
							id: rows[i].ID,
							title: rows[i].Title,
							url: rows[i].URL
						});
					}
				});
		    });
		};
		this.setPersistence = persist => {
			if (persist) {
				this.persistence = true;
				if (this.persistence) {
					this.push(this.autoplaylist[Math.floor(Math.random() * this.autoplaylist.length)].url);
				} else {
					this.voiceChannel.leave();
					this.playing = false;
				}
			} else {
				this.persistence = false;
				if (!this.playing) {
					this.voiceChannel.leave();
				}
			}
		};
		this.skip = (userId, force) => {
			return new Promise((fulfill, reject) => {
				if (!this.playing) {
					reject("No song is playing right now.");
				} else if (force) {
					this.stream.end();
					fulfill("Force skipping song regardless of skip ratio.");
				} else if (this.queue[0].skips.indexOf(userId) > -1) {
					reject("You already voted to skip this song.");
				} else {
					let skips = this.queue[0].skips.push(userId);
					this.queue[0].skipRatio = skips / this.members * 100;
					if (this.queue[0].skipRatio >= 50) {
						this.stream.end();
						fulfill("Skip ratio passed 50%. Now skipping.");
					}
					fulfill("Skip processed. Skip ratio is now " + this.queue[0].skipRatio + "%.");
				}
			});
		};
	}
}
class Video {
	constructor(query, options) {
		this.id = null;
		this.query = query;
		this.repeat = false;
		this.skipRatio = 0;
		this.skips = [];
		this.title = null;

		if (options) {
			if ("repeat" in options && typeof options.repeat === 'boolean') {
				this.repeat = options.repeat;
			}
		}
	}
}

var player = new Player();
var response = {};

const commands = {
	"add": message => {
		player.addAutoplaylist(message.content.substring(5)).then(response => message.channel.sendMessage(response))
			.catch(response => message.channel.sendMessage(response));
	},
	"persist": message => {
		player.setPersistence(true);
		if (!player.playing) {
			player.connect(message.member.voiceChannel);
		}
		message.channel.sendMessage("Bot now running in persistence mode on voice channel.");
	},
    "play": message => {
		if (!message.member.voiceChannel) {
			message.channel.sendMessage("You aren't in a voice channel! Join one to start playing music!");
		} else {
			if (!player.playing) {
				player.voiceChannel = message.member.voiceChannel;
			}
			player.push(message.content.substring(6)).then(title => message.channel.sendMessage(`Added **${title}** to queue.`));
		}
    },
	"queue": message => {
		if (player.queue.length < 1) {
			message.channel.sendMessage("```No songs queued. Add a song with '~play'!```");
		} else {
			let list = "```Markdown\n" +
			"**QUEUE:**\n" +
			"#    Title" + ' '.repeat(46) + "ID" + ' '.repeat(10) + "Repeating Skips\n";
			for (let i = 0; i < player.queue.length; i++) {
				list = list.concat("[" + i + "]: " + player.queue[i].title + player.queue[i].id + (player.queue[i].repeat ? "Yes       " : "No        ") +
				player.queue[i].skipRatio + "%" + "\n");
				if (i === player.queue.length - 1) {
					list = list.concat("```");
					message.channel.sendMessage(list);
				}
			}
		}
	},
	"repeat": message => {
		if (message.content.length < 9) {
			player.queue[0].repeat = false;
			message.channel.sendMessage("Repeat cleared. Queue should continue/end after this iteration. To force skip the song, use `~skip -f`.");
		} else {
			if (!player.playing) {
				player.voiceChannel = message.member.voiceChannel;
			}
			player.push(message.content.substring(8), true).then(title => message.channel.sendMessage(`Repeating **${title}** on bot.`));
		}
	},
	"search": message => {
		youtubeapi.search.list({
			part: "snippet",
			q: message.content.substring(8)
		}, (err, data) => {
			response[message.author.id] = [false, 0];
			message.reply("**Is this the video you were looking for? (y or n)** " + "https://www.youtube.com/watch?v=" + data.items[0].id.videoId);
			let interval = setInterval(() => {
				if (response[message.author.id][0] === true && response[message.author.id][2] === "y") {
					if (!player.playing) {
						player.voiceChannel = message.member.voiceChannel;
					}
					message.reply("Okay! Adding song to queue!");
					player.push("https://www.youtube.com/watch?v=" + data.items[response[message.author.id][1]].id.videoId);
					delete response[message.author.id];
					clearInterval(interval);
					clearTimeout(timeout);
				} else if (response[message.author.id][0] === true && response[message.author.id][1] === 2) {
					message.reply("Sorry, I couldn't find it.");
					delete response[message.author.id];
					clearInterval(interval);
					clearTimeout(timeout);
				} else if (response[message.author.id][0] === true) {
					response[message.author.id].splice(2,1);
					response[message.author.id][0] = false;
					response[message.author.id][1]++;
					message.reply("**Is this the video you were looking for?** " + "https://www.youtube.com/watch?v=" + data.items[response[message.author.id][1]].id.videoId);
					clearTimeout(timeout);
					timeout = setTimeout(() => {
						message.reply("Search timed out.");
						delete response[message.author.id];
					}, 1*1000*30);
				}
			}, 1*1000);
			let timeout = setTimeout(() => {
				message.reply("Search timed out.");
				clearInterval(interval);
				delete response[message.author.id];
			}, 1*1000*30);
		});
	},
	"skip": message => {
		let force = message.content.indexOf("-f") > -1;
		player.skip(message.author.id, force).then(response => message.channel.sendMessage(response))
			.catch(response => message.channel.sendMessage(response));
	},
	"unpersist": message => {
		player.setPersistence(false);
		message.channel.sendMessage("Bot no longer in persistence mode.");
	}
};
module.exports.commands = commands;
module.exports.player = player;
module.exports.response = response;

const main = require(`${__dirname}/Config.js`);
youtubeapi.authenticate({
	type: "key",
	key: main.youtube_api_key
});

main.bot.on("voiceStateUpdate", (oldMember, newMember) => {
	if ((oldMember.voiceChannel !== player.voiceChannel && newMember.voiceChannel === player.voiceChannel) ||
		(oldMember.voiceChannel === player.voiceChannel && newMember.voiceChannel !== player.voiceChannel)) {
			player.getUsers();
		}
});
