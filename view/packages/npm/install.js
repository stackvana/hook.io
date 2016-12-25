var packages = require('../../../lib/resources/packages');

module['exports'] = function (opts, cb) {
  var $ = this.$;
  var req = opts.req, res = opts.res;
  var params = req.resource.params;
  function npmLink (m) {
    return '<a href="https://npmjs.org/package/' + m + '">' + m + '</a>'
  };
  // don't attempt to re-install existing packages by default ( force override parameter )
  packages.installed(req.resource.params.packages, function (err, _result){
    if (err) {
      return res.end(err.message);
    }
    if (_result !== null && typeof params.force === "undefined") {
      return res.json({
        status: 'installed',
        message: 'package is already detected as installed. override installation with ?force=true'
      });
    }
    packages.install(req.resource.params.packages, function (err, result) {
      if (err) {
        return res.end(err.message);
      }
      return res.json(result);
    });
  });
};