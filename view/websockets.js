module['exports'] = function view (opts, callback) {
  var req = opts.req, $ = this.$;
  var appName = req.hostname;
  var out = $.html();
  out = out.replace(/\{\{appName\}\}/g, appName);
  callback(null, out);
};