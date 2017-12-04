var events = require('../lib/resources/events');
var config = require('../config');

module['exports'] = function view (opts, callback) {
  var $ = this.$,
      req = opts.request,
      res = opts.response;
  var appName = req.hostname;

  $ = req.white($);

  if (!req.isAuthenticated()) {
    $('.recent').html('Log in to view your ' + appName + ' system events.');
    var out = $.html();
    out = out.replace(/\{\{appName\}\}/g, appName);
    callback(null, out);
  }

  $('.currentRoot').html("/" + req.session.user);
  $('.currentRoot').attr('href', '/events')
  $('.systemEvents').attr('href', config.app.url + "/" + req.session.user + "/events");
  $('.systemEvents').html(config.app.url + "/" + req.session.user + "/events");

  $('.exampleSystemEventsLink').attr('href', config.app.url + "/" + req.session.user + "/events");
  $('.exampleSystemEventsLink').html(config.app.url + "/" + req.session.user + "/events");

  events.recent('/' + req.session.user, function(err, results){
    //  results = JSON.parse(results[0])
    $('.recent').html(JSON.stringify(results, true, 2));
    return callback(null, $.html());
  })

};