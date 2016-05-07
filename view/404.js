var config = require('../config');

module['exports'] = function (opts, cb) {
  var $ = this.$,
      req = opts.request,
      res = opts.response;

  var appAdminEmail = config.app.adminEmail;

  $('.requestedUrl').html(opts.request.url);
  if (req.jsonResponse === true) {
    var msg = {
      status: 404,
      message: opts.request.url + " was not found!"
    };
    return res.end(JSON.stringify(msg, true, 2));
  }
  var out = $.html();
  out = out.replace(/\{\{appAdminEmail\}\}/g, appAdminEmail);
  cb(null, out);
  
  //cb(null, $.html());
};