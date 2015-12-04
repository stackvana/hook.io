var events = require('../lib/resources/events');

module['exports'] = function view (opts, callback) {
  var $ = this.$;
  events.recent('/marak', function(err, results){
    console.log(results)
  //  results = JSON.parse(results[0])
    $('.recent').html(JSON.stringify(results, true, 2));
    callback(null, $.html());
  })
};