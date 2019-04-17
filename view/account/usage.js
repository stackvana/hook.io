var config = require('../../config');
var metric = require('../../lib/resources/metric');
var user = require('../../lib/resources/user');
var servicePlan = require('../../lib/resources/servicePlan');
var numberWithCommas = require('../../lib/helpers/numberWithCommas');

module['exports'] = function view (opts, callback) {
  var req = opts.req, res = opts.res, $ = this.$, params = req.resource.params;

  $ = req.white($);

  var out = $.html();

  // TODO: replace with API access key code
  // if not logged in, kick out
  if (!req.isAuthenticated()) { 
    req.session.redirectTo = "/account/usage";
    // TODO: actual login screen, not just homepage login
    //return callback(null, $.html());
    return res.redirect('/login');
  }

  if (params.reset === "true") {
    return res.end('resetting limit');
  }

  var totals = {};

  var userName = req.session.user.toLowerCase();
  $('.userName').html(userName);
  // admin override allows checking usage stats of all users
  if (params.user && userName.toLowerCase() === "marak") {
    userName = params.user.toLowerCase();
  }

  return user.findOne({ name: userName }, function (err, _user) {
    if (err) {
      return res.end(err.message);
    }
    // console.log('getting metrics for'.yellow, userName)
    _user.servicePlan = _user.servicePlan || 'trial';
    return metric.hgetall('/' + userName + '/report', function (err, report) {
      if (err) {
        return res.end(err.message);
      }
      if (req.jsonResponse) {
        return res.json(report);
      } else {
        if (report === null) {
          $('.usageContainer').html('No metrics recorded yet. <a href="' + config.app.url + '/services' + '">Try running a service?</a>');
          return callback(null, $.html());
        }
        var now = new Date();
        var month = 'monthlyHits - ' + (now.getMonth() + 1) + '/' + now.getFullYear();

        $('.usage').append('<tr><td><strong>' + 'Service Plan' + '</strong></td><td>' + (_user.servicePlan || 'trial') +'</td></tr>');
        $('.usage').append('<tr><td><strong>' + 'Currently Running' + '</strong></td><td>' + report['running'] +' / ' + servicePlan[_user.servicePlan].concurrency +'</td></tr>');
        $('.usage').append('<tr><td><strong>' + 'Monthly Hits ' + (now.getMonth() + 1) + '/' + now.getFullYear() + '</strong></td><td>' + report[month] +' / ' + numberWithCommas(servicePlan[_user.servicePlan].hits) +'</td></tr>');
        $('.usage').append('<tr><td><strong>' + 'Total Hits' + '</strong></td><td>' + numberWithCommas(report['totalHits']) + '</td></tr>');

        callback(null, $.html());
      }
    });
  });

};