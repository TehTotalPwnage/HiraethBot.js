const githubhook =require('githubhook');
var github = githubhook();

github.listen();

github.on('push', function (repo, ref, data) {
	console.log(data.commits.author.name + "(" + data.commits.author.username +
		") pushed a new commit to " + data.repository.fullname + " (" + data.commits.message +
		"): " + data.commits.url);
});