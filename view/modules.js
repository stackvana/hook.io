module['exports'] = function view (opts, callback) {
  // attempt to reload view manually
  var req = opts.request,
      res = opts.response;
  var v = req.url;

  /*
  var appName = req.hostname;
  var out = $.html();
  out = out.replace(/\{\{appAdminEmail\}\}/g, appAdminEmail);
  */
  return res.redirect(301, '/packages');
  //callback(null, this.$.html());
};