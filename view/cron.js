var hook = require('../lib/resources/hook');
var user = require('../lib/resources/user');
var parser = require('cron-parser');

module['exports'] = function view (opts, callback) {
  var $ = this.$,
  req = opts.req;
  hook.find({ owner: req.session.user || "anonymous", cronActive: true }, function (err, result) {
    if (err) {
      return res.end(err.message);
    }
    if (result.length === 0) {
      $('.userCrons').remove();
    }
    $('.serverTime').html(new Date().toString())
    result.forEach(function(cron){
      // $('.currentCrons').append(cron.name + '<br/>');
      cron.lastCron = cron.lastCron || "n/a";
      // cron.nextCron = cron.nextCron || "n/a";
      try {
        var last = new Date(cron.lastCron);
        if (last === 'Invalid Date') {
          last = new Date()
        }
        var options = {
          currentDate: last
        };
        var interval = parser.parseExpression(cron.cron.toString());
        var next = interval.next();
        cron.nextCron = next;
      } catch (err) {
        cron.nextCron = "n/a";
      }
      $('.currentCrons').append('<tr><td><a href="{{appUrl}}/admin?owner=' + cron.owner + "&name=" + cron.name + '">' + cron.owner + "/" + cron.name + '</a></td><td>' + cron.cron +'</td>' + '<td>' + cron.lastCron + '</td>'  + '<td>' + cron.nextCron + '</td>'  + '</tr>');
    });
    $ = req.white($);
    callback(null, $.html());
  });
};