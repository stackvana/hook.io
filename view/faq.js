var langs = require('../lib/resources/programmingLanguage');

module['exports'] = function presentFaq (opts, callback) {

  var $ = this.$;
  Object.keys(langs.languages).forEach(function(l){
    $('.left_middle_widget .tag').append('<li><a href="#">' + l + '</a></li>&nbsp;');
  });
  var out = $.html();
  var appName = "hook.io",
      appAdminEmail = "hookmaster@hook.io",
      appPhonePrimary = "1-555-555-5555";
  out = out.replace(/\{\{appName\}\}/g, appName);
  out = out.replace(/\{\{appAdminEmail\}\}/g, appAdminEmail);
  out = out.replace(/\{\{appPhonePrimary\}\}/g, appPhonePrimary);
  return callback(null, out);
};