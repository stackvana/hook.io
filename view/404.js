module['exports'] = function (opts, cb) {
  var $ = this.$;
  $('.requestedUrl').html(opts.request.url);
  cb(null, $.html());
};