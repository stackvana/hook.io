var resource = require('resource');
var usage = resource.define('usage');
var metric = require('./metric');
var email = require('resource-email');

usage.timestamps();

usage.method('reset', function (data, cb){
  var userName = data.account;
  // reset the user's account limits
  metric.zrem("hits", userName, function (err, status) {
    if (err) {
      return cb(err);
    }
    // console.log('metric.' +  userName + '.hits'.green, err, accountHits);
    // totals.hits = accountHits;
    metric.zrem("running", userName, function (err, runningServices) {
      if (err) {
        return cb(err);
      }
      cb(null, data)
    });
  });
});

resource.on('usage::reset', function (data){
  // send email to admins of what just happened
  email.send({
    provider: config.email.provider,
    to: 'marak.squires@gmail.com',
    from: 'hookmaster@hook.io',
    subject: 'hook.io - usage reset request - ' + data.account,
    html:  data.reasons + '<br/><hr/>' + data.comments
  }, function (err){
    if (err) {
      console.log(err);
      return;
    }
    console.log('usage reset email sent', data)
  })
  
});

module['exports'] = usage;