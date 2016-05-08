var langs = require('../lib/resources/programmingLanguage');

module['exports'] = function (opts, cb) {
  var $ = this.$;
  var req = opts.req;
  console.log(langs)
  
  Object.keys(langs.languages).forEach(function (key) {
    $('.languages').append('<li>' + key + '</li>');
  });
  $ = req.white($);
  cb(null, $.html());
};