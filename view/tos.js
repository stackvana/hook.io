module['exports'] = function view (opts, callback) {

  var $ = this.$,
  req = opts.request,
  res = opts.response,
  params = req.resource.params;
  var appName = "hook.io",
      appAdminEmail = "hookmaster@hook.io",
      appPhonePrimary = "1-555-555-5555";
  var out = $.html();
  out = out.replace(/\{\{appName\}\}/g, appName);
  out = out.replace(/\{\{appAdminEmail\}\}/g, appAdminEmail);
  out = out.replace(/\{\{appPhonePrimary\}\}/g, appPhonePrimary);
  callback(null, out);

};