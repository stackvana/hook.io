module['exports'] = function view (opts, callback) {
  var $ = this.$, req = opts.req;
  var out = $.html();
  var appName = req.hostname;
  out = out.replace(/\{\{appName\}\}/g, appName);
  callback(null, out);
};