module['exports'] = function view (opts, callback) {
  var req = opts.request
      $ = this.$;
  var out = $.html();
  var appName = req.hostname;
  out = out.replace(/\{\{appName\}\}/g, appName);
  //req.i18n.setLocale('de');
  return callback(null, out);
};