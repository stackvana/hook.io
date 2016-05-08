var langs = require('../lib/resources/programmingLanguage');

module['exports'] = function doc (opts, callback) {
  var $ = this.$,
      req = opts.request;
  var i18n = require('./helpers/i18n');
  i18n(req.i18n, $);
  Object.keys(langs.languages).forEach(function(l){
    $('.left_middle_widget .tag').append('<li><a href="#">' + l + '</a></li>&nbsp;');
  });
  $ = req.white($);
  return callback(null, $.html());
};