var user = require('../lib/resources/user'),
    hook = require('../lib/resources/hook'),
    request = require('request');

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

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
      $('.totalRun').html(numberWithCommas(count));
      request('https://api.github.com/repos/bigcompany/hook.io', {
        headers: {
          "User-Agent": "hook.io stats"
        },
        json: true
      }, function (err, res, output) {
        if (err) {
          console.log(err.message);
        }
        callback(null, $.html());
      });
    });
  });
};

// cache this page to only reload every 60 seconds
module['exports'].cache = 60000;