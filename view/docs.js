module['exports'] = function doc (opts, callback) {
  var $ = this.$,
      req = opts.request;
  var i18n = require('./helpers/i18n');
  i18n(req.i18n, $);
  //req.i18n.setLocale('de');
  return callback(null, $.html());
};