var psr = require('parse-service-request');
var user = require('../../lib/resources/user');
var df = require('dateformat');
var moment = require('moment');

var TRIAL_DAYS_LIMIT = 60;

module.exports = function accountExpiredView (opts, cb) {
  var $ = this.$, res = opts.res, req = opts.req;
  $ = req.white($);
  if (!req.isAuthenticated()) {
    return res.redirect(302, '/login');
  }
  psr(req, res, function () {
    $('.boxAlert').remove();
    var params = req.resource.params;
    if (req.method === "POST") {
      // check to see if valid email was posted
      if (typeof params.email === 'string' && params.email.length > 0 && params.email.search('@') !== -1) {
        user.findOne({ name: req.session.user }, function(err, _user){
          if (err) {
            res.status(500)
            return res.json({ error: true, message: err.message });
          }
          _user.email = params.email;
          _user.save(function(err){
            if (err) {
              res.status(500)
              return res.json({ error: true, message: err.message });
            }
            req.session.email = params.email;
            return res.end('set-email')
          });
        })
      } else {
        res.status(400);
        return res.json({ error: true, message: 'Invalid email address'});
      }
    } else {
      user.findOne({ name: req.session.user }, function (err, _user) {
        if (err) {
          res.status(500);
          return res.json({ error: true, message: err.message });
        }
        var now = moment();
        var created = moment(_user.ctime);
        var daysSinceCreation = now.diff(created, 'days');

        // $('.daysLeftInTrial').html((TRIAL_DAYS_LIMIT - daysSinceCreation).toString());
        $('.daysSinceCreation').html((daysSinceCreation).toString());
        $('.accountCreated').html(created.format('MMMM Do, YYYY'));

        return cb(null, $.html());
      })
    }
  })
}