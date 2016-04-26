module['exports'] = function view (opts, callback) {

  var $ = this.$,
      req = opts.request,
      res = opts.response;
      var appName = request.hostname;
      var out = $.html();
      out = out.replace(/\{\{appName\}\}/g, appName);
      callback(null, out);

};