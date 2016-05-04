module['exports'] = function view (opts, callback) {
  var req = opts.request
      $ = this.$;
  //$('title').html('hook.io/blog - all things microservice, the hook.io microservice blog');
  var out = $.html();
  var appName = req.hostname;
  out = out.replace(/\{\{appName\}\}/g, appName);
  //req.i18n.setLocale('de');
  return callback(null, out);
};