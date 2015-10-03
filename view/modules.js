module['exports'] = function view (opts, callback) {
  // attempt to reload view manually
  var req = opts.request,
      res = opts.response;
  var v = req.url;
  return res.redirect(301, '/packages');
  //callback(null, this.$.html());
};