var modules = require('../../resources/packages');

module['exports'] = function (req, res, app) {
  var packages = req.resource.params.packages;
  if (typeof packages !== "undefined") {
    if(typeof packages === "string") {
      packages = [packages];
    }
    var arr = [];
    packages.forEach(function(p){
      p = p.replace(/\./g, "");
      p = p.replace(/\//g, "");
      arr.push(p);
    });
    modules.install(arr[0], function(err, r){
      if (err) {
        return res.end(err.message);
      }
      res.end('Successfully installed deps: ' + JSON.stringify(packages, true, 2));
    })
  } else {
    return res.end('packages parameter is required!')
  }
};