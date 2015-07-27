module['exports'] = function (opts, cb) {
  var $ = this.$;
  cb(null, $.html());
};