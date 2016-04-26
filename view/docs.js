module['exports'] = function doc (opts, callback) {
  var $ = this.$,
      req = opts.request;
  var i18n = require('./helpers/i18n');
  i18n(req.i18n, $);
  var out = $.html();
  // var appName = "hook.io";
  var appName = req.hostname;
  out = out.replace(/\{\{appName\}\}/g, appName);
  //req.i18n.setLocale('de');
  return callback(null, out);
};