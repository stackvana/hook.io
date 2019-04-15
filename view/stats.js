var user = require('../lib/resources/user'),
    metric = require('../lib/resources/metric'),
    hook = require('../lib/resources/hook'),
    request = require('request');

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
module['exports'] = function view (opts, callback) {
  var $ = this.$;
  metric.get('/user/count', function(err, userCount){
    if (userCount === null) {
      userCount = 0;
    }
    $('.activeUsers').html(numberWithCommas(userCount.toString()));
    metric.get('/hook/count', function(err, hookCount){
      metric.zscore('totalHits', 'tallies', function (err, m) {
      //metric.get('/hook/totalHits', function(err, m){
        if (hookCount === null) {
          hookCount = 0;
        }
        if (m === null) {
          m = 0;
        }
        $('.activeServices').html(numberWithCommas(hookCount.toString()));
        var count = m.toString();
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
  });
};

// cache this page to only reload every 60 seconds
// module['exports'].cache = 60000; // TODO: make longer