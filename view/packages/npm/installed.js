var packages = require('../../../lib/resources/packages');

module['exports'] = function (opts, cb) {
  var $ = this.$;
  function npmLink (m) {
    return '<a href="https://npmjs.org/package/' + m + '">' + m + '</a>'
  };
  packages.all({ status: 'installed' }, function(err, results){
    if (err) {
      return res.end(err.message);
    }
    results = results.sort();
    results.forEach(function(m){
      var parts = m.split('@');
      $('.installed').append('<tr><td>' + npmLink(parts[0]) + '</td><td>' + parts[1] + '</td></tr>')
    });
    if (results.length === 0) {
      $('.installed').remove();
      $('.status').html('No packages installed');
    }
    cb(null, $.html());
  });
};