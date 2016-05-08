var langs = require('../lib/resources/programmingLanguage');

module['exports'] = function presentFaq (opts, callback) {

  var $ = this.$, req = opts.req;
  Object.keys(langs.languages).forEach(function(l){
    $('.left_middle_widget .tag').append('<li><a href="#">' + l + '</a></li>&nbsp;');
  });

  $ = req.white($);
  return callback(null, $.html());

};