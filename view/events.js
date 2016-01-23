var events = require('../lib/resources/events');

module['exports'] = function view (opts, callback) {
  var $ = this.$,
      req = opts.request,
      res = opts.response;
  
  if (!req.isAuthenticated()) {
    req.session.user = "marak";
    $('.recent').html('Log in to view your hook.io system events.');
    callback(null, $.html());
  }

  $('.currentRoot').html("/" + req.session.user);
  $('.currentRoot').attr('href', '/events')
  
  events.recent('/' + req.session.user, function(err, results){
    console.log(results)
  //  results = JSON.parse(results[0])
    $('.recent').html(JSON.stringify(results, true, 2));
    callback(null, $.html());
  })
};