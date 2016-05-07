module['exports'] = function view (opts, callback) {
  var $ = this.$, req = opts.req;
  var appName = req.hostname;
  var out = $.html();
  out = out.replace(/\{\{appName\}\}/g, appName);
  out = out.replace(/\{\{appSdkName\}\}/g, 'hook.io-sdk');
  callback(null, out);
};