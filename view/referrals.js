var user = require('../lib/resources/user');

module['exports'] = function view (opts, callback) {

  var $ = this.$,
      req = opts.request,
      res = opts.response;

  if (!req.isAuthenticated()) { 
    req.session.redirectTo = "/referrals";
    return res.redirect('/login');
  }

  $ = req.white($);

  return user.find({
    referredBy: req.session.user
  }, function (err, results){
    if (err) {
      return res.end(err.message);
    }
    if (results.length > 0) {
      $('.referrals').html('');
      results.forEach(function(u){
        $('.referrals').append('<a href="https://hook.io/' + u.name + '">' + u.name +  '</a>' + '<br/>')
      });
    }
    callback(null, $.html().replace(/\{\{username\}\}/g, req.session.user));
  });

};