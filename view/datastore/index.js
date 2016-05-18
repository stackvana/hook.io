var Datastore = require('../../lib/resources/datastore').Datastore;

module['exports'] = function view (opts, callback) {

  var $ = this.$, 
      req = opts.request, 
      params = req.resource.params;

  $ = req.white($);

  // if not logged in, simply show documentation page
  if (!req.isAuthenticated()) {
    $('.last').remove();
    req.session.user = "anonymous";
    $('.currentRoot').html("/" + req.session.user);
    $('.currentRoot').attr('href', '/datastore/recent')
    return callback(null, $.html());
  }

  $('.currentRoot').html("/" + req.session.user);
  $('.currentRoot').attr('href', '/datastore/recent');
  $('.root .hint').remove();
  $('.last').remove();
  return callback(null, $.html());

};