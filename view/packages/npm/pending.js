var packages = require('../../../lib/resources/packages');

module['exports'] = function npmPending (opts, cb) {
  var $ = this.$;
  function npmLink (m) {
    return '<a href="https://npmjs.org/package/' + m + '">' + m + '</a>'
  };
  $('.pending').remove();
  $('.status').html('No packages pending installation.');
  cb(null, $.html());
  /* Remove ( for now)
  packages.all({ status: 'pending' }, function(err, results){
    if (err) {
      return res.end(err.message);
    }
    results = results.sort();
    results.forEach(function(m){
      var parts = m.split('@');
      var v =  parts[1] || "latest";
      $('.pending').append('<tr><td>' + npmLink(parts[0]) + '</td><td>' + v + '</td></tr>')
    });
    if (results.length === 0) {
      $('.pending').remove();
      $('.status').html('No packages pending installation.');
    }
    cb(null, $.html());
  });
  */
};