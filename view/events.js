var events = require('../lib/resources/events');

module['exports'] = function view (opts, callback) {
  var $ = this.$,
      req = opts.request,
      res = opts.response;
  var appName = req.hostname;

  if (!req.isAuthenticated()) {
    $('.recent').html('Log in to view your ' + appName + ' system events.');
    var out = $.html();
    out = out.replace(/\{\{appName\}\}/g, appName);
    callback(null, out);
  }

  $('.currentRoot').html("/" + req.session.user);
  $('.currentRoot').attr('href', '/events')

  events.recent('/' + req.session.user, function(err, results){
    //  results = JSON.parse(results[0])
    $('.recent').html(JSON.stringify(results, true, 2));
    $ = req.white($);
    return callback(null, $.html());
  })

};