/*jshint esversion: 6 */
const Snoowrap = require('snoowrap');

const Config = require('./Config');
const HiraethBot = require('./HiraethBot');

var RedditBot = new Snoowrap({
	user_agent: Config.reddit.user_agent,
	client_id: Config.reddit.client_id,
	client_secret: Config.reddit.client_secret,
	username: Config.reddit.username,
	password: Config.reddit.password
});

var getEmojipasta = function(query, callback) {
	RedditBot.search({
		query: query,
		subreddit: 'emojipasta'
	}).then(results => {
		if (!results[0].selftext) {
			callback("An error occured. Likely no search results were found. Search again?");
		} else {
			callback("**" + results[0].title + ":** " +results[0].selftext);
		}
	});
};
var getFiftyfifty = function(callback) {
	RedditBot.get_random_submission('fiftyfifty').then(submission => {
		if (!submission.url) {
			callback("An error occured. Try again?");
		} else {
			callback("**" + submission.title + ":** [" + submission.url + "]");
		}
	});
};
var getPolandball = function(query, callback) {
	RedditBot.search({
		query: query,
		subreddit: 'polandball'
	}).then(results => {
		if (!results[0].url) {
			callback("An error occured. Likely no search results were found. Search again?");
		} else {
			callback("**" + results[0].title + ":** " + results[0].url);
		}
	});
};

module.exports.getEmojipasta = getEmojipasta;
module.exports.getFiftyfifty = getFiftyfifty;
module.exports.getPolandball = getPolandball;