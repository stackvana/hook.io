var user = require('../lib/resources/user'),
    hook = require('../lib/resources/hook'),
    request = require('request');

module['exports'] = function view (opts, callback) {
  var $ = this.$;
  user.all(function(err, results){
    $('.activeUsers').html(results.length)
    hook.all(function(err, results){
      $('.activeServices').html(results.length);
      var count = 0;
      results.forEach(function(h){
        count += h.ran;
      });
      $('.totalRun').html(count);
      request('https://api.github.com/repos/bigcompany/hook.io', {
        headers: {
          "User-Agent": "hook.io stats"
        },
        json: true
      }, function (err, res, output) {
        if (err) {
          console.log(err.message);
        }
        $('.githubStars').html(output.stargazers_count);
        $('.projectForks').html(output.forks_count);
        callback(null, $.html());
      });
    });
  });
};