module['exports'] = function view (opts, callback) {

  var $ = this.$,
      req = opts.request,
      res = opts.response;

  callback(null, $.html());

};