module['exports'] = function defaultTheme (options, callback) {
  var $ = this.$,
      req = options.request;
  $('title').html(req.params.owner + "/" + req.params.hook);
  callback(null, $.html());
};