const events = require("events");
const sqlite = require("sqlite");
const youtubeapi = require("youtube-api");
const youtubedl = require("youtube-dl");

function parse(number) {
	let date = new Date(number);
	return date.getMinutes() + ":" + (date.getSeconds().toString().length === 1 ? "0" + date.getSeconds() : date.getSeconds());
}

function toDigits(number, places) {
	let output = number.toString();
	if (output.length < places) {
		if (output.indexOf(".") === - 1) output += ".";
		let change = places - output.replace(/\./g, '').length;
		for (let i = 0; i < change; i++) {
			output += "0";
		}
		return output;
	} else if (output.length > places) {
		return output.substring(0, output.indexOf(".") > -1 ? places + 1 : places);
	} else {
		return output;
	}
}

class Player extends events.EventEmitter {
	constructor(bot) {
		super();

		bot.on("voiceStateUpdate", (oldMember, newMember) => {
			if ((oldMember.voiceChannel !== this.voiceChannel && newMember.voiceChannel === this.voiceChannel) ||
				(oldMember.voiceChannel === this.voiceChannel && newMember.voiceChannel !== this.voiceChannel)) {
					this.getUsers();
				}
		});

		this.activePlaylist = "Default";
		this.autoplaylist = new Map();
		this.commands = {
			info: {
				name: "Music",
				description: "All commands related to playing music over a voice channel."
			},
			commands: {
				add: {
					description: "Adds a YouTube URL to a specified autoplaylist.",
					execute: message => {
						if (message.content.split(" ").length < 3) {
							return message.channel.sendMessage("Improper set of arguments!\n```Usage: add <name of playlist> <YouTube URL>```");
						} else if (!this.autoplaylist.has(message.content.split(" ")[1])) {
							return message.channel.sendMessage(`Could not find an autoplaylist named \`${message.content.split(" ")[1]}\`.`);
						}
						this.addAutoplaylist(message.content.split(" ")[1], message.content.split(" ")[2]).then(response => message.channel.sendMessage(response))
							.catch(response => message.channel.sendMessage(response));
					},
					help: "add <autoplaylist name> <YouTube video URL>"
				},
				listplaylist: {
					description: "Lists all autoplaylists. Use an argument to list the songs in one particular playlist.",
					execute: message => {
						if (message.content.split(" ")[1]) {
							let songs = [];
							this.autoplaylist.forEach((result, name) => {
								if (name.toLowerCase() === message.content.split(" ")[1].toLowerCase()) {
									songs.push(name);
									songs.push(result);
								}
							});
							if (!songs) {
								return message.channel.sendMessage("Autoplaylist not found. Check your query.");
							}
							let response = "```Markdown\n**SONGS IN AUTOPLAYLIST " + songs[0] + "**\n";
							let i = 1;
							songs[1].forEach(song => {
								response += `**[${i}]:** ${song}\n`;
								i++;
							});
							response += "```";
							return message.channel.sendMessage(response);
						}
						let response = "```Markdown\n**ALL AUTOPLAYLISTS**\n";
						let i = 1;
						this.autoplaylist.forEach((result, name) => {
							response += `**[${i}]:** ${name}\n`;
							i++;
						});
						response += "```";
						message.channel.sendMessage(response);
					},
					help: "listplaylist [name of playlist]"
				},
				newplaylist: {
					description: "Creates a new autoplaylist.",
					execute: message => {
						if (message.content.split(" ").length < 2) {
							return message.channel.sendMessage("Improper set of arguments!\n```Usage: newplaylist <autoplaylist name>```");
						}
						sqlite.open(`${__dirname}/../data.sqlite3`).then(() => {
							sqlite.prepare(`INSERT INTO Autoplaylists (Name, URLs) VALUES (?, "")`).then(stmt => {
								stmt.run(message.content.split(" ")[1]).then(this.reloadPlaylist);
								message.channel.sendMessage(`Created new autoplaylist \`${message.content.split(" ")[1]}\`.`);
							});
				        });
					},
					help: "newplaylist <autoplaylist name>"
				},
				persist: {
					description: "Enables persistence mode, which allows the bot to stay connected after queue is completed and play the autoplaylist.",
					execute: message => {
						this.setPersistence(true);
						if (!this.playing) {
							this.connect(message.member.voiceChannel);
						}
						message.channel.sendMessage("Bot now running in persistence mode on voice channel.");
					},
					help: "persist"
				},
			    play: {
					description: "Plays a YouTube URL or search query.",
					execute: message => {
						if (!message.member.voiceChannel) {
							message.channel.sendMessage("You aren't in a voice channel! Join one to start playing music!");
						} else {
							if (!this.playing) {
								this.voiceChannel = message.member.voiceChannel;
							}
							this.push(message.content.substring(6)).then(title => message.channel.sendMessage(`Added **${title}** to queue.`));
						}
				    },
					help: "play <Youtube video URL | YouTube search query>"
				},
				queue: {
					description: "Displays the current queue for the bot.",
					execute: message => {
						if (this.queue.length < 1) {
							message.channel.sendMessage("```No songs queued. Add a song with '~play'!```");
						} else {
							let list = "```Markdown\n" +
							"**QUEUE:**\n" +
							`*Persistence:* ${this.persistence ? "On" : "Off"} *Volume*: ${this.volume}\n` +
							"#    Title" + ' '.repeat(46) + "ID" + ' '.repeat(10) + "Repeating Skips Duration\n";
							for (let i = 0; i < this.queue.length; i++) {
								list += "[" + i + "]: " + this.queue[i].title + this.queue[i].id + (this.queue[i].repeat ? "Yes       " : "No        ") +
								toDigits(this.queue[i].skipRatio, 3) + "% " + (i === 0 ? parse(this.stream.time) + "/" : "") + this.queue[i].duration + "\n";
							}
							list = list.concat("```");
							message.channel.sendMessage(list);
						}
					},
					help: "queue"
				},
				repeat: {
					description: "Puts a YouTube URL or search query on repeat until it is removed from repeat.",
					execute: message => {
						if (message.content.length < 9) {
							this.queue[0].repeat = false;
							message.channel.sendMessage("Repeat cleared. Queue should continue/end after this iteration. To force skip the song, use `~skip -f`.");
						} else {
							if (!this.playing) {
								this.voiceChannel = message.member.voiceChannel;
							}
							this.push(message.content.substring(8), true).then(title => message.channel.sendMessage(`Repeating **${title}** on bot.`));
						}
					},
					help: "repeat [YouTube URL | YouTube search query]"
				},
				resetqueue: {
					description: "Empties the queue of all playing songs, disconnecting the bot from the voice channel.",
					execute: message => {
						this.queue[0].repeat = false;
						this.queue.splice(1, this.queue.length - 1);
						this.skip(message.author.id, true);
						message.channel.sendMessage("Clearing queue of all songs and disconnecting.");
					},
					help: "resetqueue"
				},
				search: {
					description: "Loads an interactive YouTube search for adding a song to the queue.",
					execute: message => {
						youtubeapi.search.list({
							part: "snippet",
							q: message.content.substring(8)
						}, (err, data) => {
							this.response[message.author.id] = [false, 0];
							message.reply("**Is this the video you were looking for? (y or n)** " + "https://www.youtube.com/watch?v=" + data.items[0].id.videoId);
							let interval = setInterval(() => {
								if (this.response[message.author.id][0] === true && this.response[message.author.id][2] === "y") {
									if (!this.playing) {
										this.voiceChannel = message.member.voiceChannel;
									}
									message.reply("Okay! Adding song to queue!");
									this.push("https://www.youtube.com/watch?v=" + data.items[this.response[message.author.id][1]].id.videoId);
									delete this.response[message.author.id];
									clearInterval(interval);
									clearTimeout(timeout);
								} else if (this.response[message.author.id][0] === true && this.response[message.author.id][1] === 2) {
									message.reply("Sorry, I couldn't find it.");
									delete this.response[message.author.id];
									clearInterval(interval);
									clearTimeout(timeout);
								} else if (this.response[message.author.id][0] === true) {
									this.response[message.author.id].splice(2,1);
									this.response[message.author.id][0] = false;
									this.response[message.author.id][1]++;
									message.reply("**Is this the video you were looking for?** " + "https://www.youtube.com/watch?v=" + data.items[this.response[message.author.id][1]].id.videoId);
									clearTimeout(timeout);
									timeout = setTimeout(() => {
										message.reply("Search timed out.");
										delete this.response[message.author.id];
									}, 1*1000*30);
								}
							}, 1*1000);
							let timeout = setTimeout(() => {
								message.reply("Search timed out.");
								clearInterval(interval);
								delete this.response[message.author.id];
							}, 1*1000*30);
						});
					},
					help: "search <YouTube search query>"
				},
				setplaylist: {
					description: "Set the autoplaylist that persistence should pull from.",
					execute: message => {
						if (message.content.split(" ").length < 2) {
							return message.channel.sendMessage("Improper set of arguments!\n```Usage: setplaylist <autoplaylist name>```");
						} else if (!this.autoplaylist.has(message.content.split(" ")[1])) {
							return message.channel.sendMessage(`Could not find autoplaylist \`${message.content.split(" ")[1]}\``);
						}
						this.activePlaylist = message.content.split(" ")[1];
						message.channel.sendMessage(`Set active autoplaylist to \`${message.content.split(" ")[1]}\`.`);
					},
					help: "setplaylist <playlist name>"
				},
				setvolume: {
					description: "Sets the volume based on a multiplier of the normal volume. (1 is normal, 0.5 is half, 2 is double.)",
					execute: message => {
						if (!message.member.hasPermission("ADMINISTRATOR")) {
							message.channel.sendMessage("This is an admin only command.");
							return;
						}
						if (isNaN(message.content.split(" ")[1])) {
							message.channel.sendMessage("The argument you provided is not a number. Provide a number.");
							return;
						}
						if (message.content.split(" ")[1] < 0.1 || message.content.split(" ")[1] > 2) {
							message.channel.sendMessage("The volume value you specified is too extreme. Please use user volume instead.");
							return;
						}
						this.volume = message.content.split(" ")[1];
						if (this.playing) {
							this.stream.setVolume(message.content.split(" ")[1]);
						}
						message.channel.sendMessage(`Set bot volume to ${message.content.split(" ")[1]}.`);
					},
					help: "setvolume <volume number>"
				},
				skip: {
					description: "Vote to skip a song. Use -f to force skip.",
					execute: message => {
						let songId = 0;
						message.content.split(" ").forEach(value => {
							if(!isNaN(value)) {
								songId = value;
							}
						});
						if (songId === 0 && this.queue[songId].repeat === true) {
							message.channel.sendMessage("This is not the proper way to skip a currently repeating song! Use `~repeat` to disable the repeat before skipping.");
							return;
						}
						let force = message.content.indexOf("-f") > -1 && message.member.hasPermission("ADMINISTRATOR");
						this.skip(message.author.id, force, songId).then(response => message.channel.sendMessage(response))
							.catch(response => message.channel.sendMessage(response));
					},
					help: "skip [-f]"
				},
				unpersist: {
					description: "Disables persistence mode on the bot.",
					execute: message => {
						this.setPersistence(false);
						message.channel.sendMessage("Bot no longer in persistence mode.");
					},
					help: "unpersist"
				}
			}
		};
		this.connection = null;
		this.members = 0;
		this.persistence = false;
		this.playing = false;
		this.queue = [];
		this.response = {};
		this.stream = null;
		this.voiceChannel = null;
		this.volume = 0.5;

		this.addAutoplaylist = (list, url) => {
			return new Promise((fulfill, reject) => {
				youtubedl.getInfo(url, [], {maxBuffer: Infinity}, (err, info) => {
					if (err) {
						reject("An error occured. You might've forgotten to use a URL for the query.");
					} else {
						sqlite.open(`${__dirname}/../data.sqlite3`).then(() => {
							sqlite.prepare(`UPDATE Autoplaylists SET URLs = URLs || CASE WHEN URLs is null or URLS = "" THEN ? ELSE ("," || "${url}") END WHERE Name=?`).then(stmt => {
								stmt.run(url, list).then(this.reloadPlaylist);
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
				youtubedl.getInfo(query, [], {maxBuffer: Infinity}, (err, info) => {
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
						this.queue[length - 1].duration = info.duration;
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
			let video = search ? youtubedl("ytsearch:" + song.query, ['-f bestaudio/best'], {maxBuffer: Infinity}) : youtubedl(song.query, ['-f bestaudio/best'], {maxBuffer: Infinity});
			video.on('error', () => {
				console.log("There was an error loading the long, likely due to a search. Retrying...");
				this.play(song, true);
			});
			video.on('info', () => {
				console.log("Song fetched! Now playing...");
				this.stream = this.connection.playStream(video);
				this.stream.setVolume(this.volume);
				this.stream.on('end', () => {
					this.playing = false;
					if (song.repeat) {
						this.play(song);
					} else {
						this.queue.splice(0, 1);
						if (this.queue[0]) {
							this.play(this.queue[0]);
						} else if (this.persistence) {
							this.push(this.autoplaylist.get(this.activePlaylist)[Math.floor(Math.random() * this.autoplaylist.get(this.activePlaylist).length)]);
						} else {
							this.voiceChannel.leave();
						}
					}
				});
			});
		};
		this.reloadPlaylist = () => {
			sqlite.open(`${__dirname}/../data.sqlite3`).then(() => {
				sqlite.all("SELECT Name, URLs FROM Autoplaylists").then(rows => {
					for (let i = 0; i < rows.length; i++) {
						let urls = rows[i].URLs.split(",");
						this.autoplaylist.set(rows[i].Name, urls);
					}
				});
		    });
		};
		this.setPersistence = persist => {
			if (persist) {
				this.persistence = true;
				if (this.persistence && !this.playing) {
					this.push(this.autoplaylist.get(this.activePlaylist)[Math.floor(Math.random() * this.autoplaylist.get(this.activePlaylist).length)]);
				}
			} else {
				this.persistence = false;
				if (!this.playing) {
					this.voiceChannel.leave();
				}
			}
		};
		this.skip = (userId, force, queueId = 0) => {
			return new Promise((fulfill, reject) => {
				if (!this.playing) {
					reject("No song is playing right now.");
				} else if (force) {
					if (queueId === 0) {
						this.stream.end();
					} else {
						this.queue.splice(queueId, 1);
					}
					fulfill("Force skipping song regardless of skip ratio.");
				} else if (this.queue[queueId].skips.indexOf(userId) > -1) {
					reject("You already voted to skip this song.");
				} else {
					let skips = this.queue[queueId].skips.push(userId);
					this.queue[queueId].skipRatio = skips / this.members * 100;
					if (this.queue[queueId].skipRatio >= 50) {
						if (queueId === 0) {
							this.stream.end();
						} else {
							this.queue.splice(queueId, 1);
						}
						fulfill("Skip ratio passed 50%. Now skipping.");
					}
					fulfill("Skip processed. Skip ratio is now " + this.queue[queueId].skipRatio + "%.");
				}
			});
		};
	}
}
class Video {
	constructor(query, options) {
		this.duration = "0:00";
		this.id = null;
		this.query = query;
		this.repeat = false;
		this.skipRatio = 0.00;
		this.skips = [];
		this.title = null;

		if (options) {
			if ("repeat" in options && typeof options.repeat === 'boolean') {
				this.repeat = options.repeat;
			}
		}
	}
}

module.exports.Player = Player;
