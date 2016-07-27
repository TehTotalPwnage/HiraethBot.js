/*jshint esversion: 6 */

const config = require('./Config');
const Snoowrap = require('snoowrap');

var RedditBot = new Snoowrap({
	user_agent: config.reddit.user_agent,
	client_id: config.reddit.client_id,
	client_secret: config.reddit.client_secret,
	username: config.reddit.username,
	password: config.reddit.password
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