var langs = require('../lib/resources/programmingLanguage');

module['exports'] = function presentFaq (opts, callback) {
  console.log(langs);
  
  var $ = this.$;
  Object.keys(langs.languages).forEach(function(l){
    $('.left_middle_widget .tag').append('<li><a href="#">' + l + '</a></li>&nbsp;');
  });
  callback(null, this.$.html());
};