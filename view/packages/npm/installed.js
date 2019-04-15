var packages = require('../../../lib/resources/packages');

module['exports'] = function (opts, cb) {
  var $ = this.$;
  function npmLink (m) {
    return '<a href="https://npmjs.org/package/' + m + '">' + m + '</a>'
  };
  $('.installed').remove();
  $('.status').html('The NPM Package Listing has been temporarily removed.');
  return cb(null, $.html());
  /* Removed ( for now / was not accurate )
  packages.all({ status: 'installed' }, function(err, results){
    if (err) {
      return res.end(err.message);
    }
    results = results.sort();
    results.forEach(function(m){
      var parts = m.split('@');
      var v =  parts[1] || "latest";
      $('.installed').append('<tr><td>' + npmLink(parts[0]) + '</td><td>' + v + '</td></tr>')
    });
    if (results.length === 0) {
      $('.installed').remove();
      $('.status').html('No packages installed');
    }
    cb(null, $.html());
  });
  */
};