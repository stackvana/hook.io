var modules = {};
module['exports'] = modules;

var redis = require("redis"),
    client = redis.createClient();

var MAX_modulesS_PER_HOOK = 50;
var npm = require('./npm');

// TODO: better error handling and client setup/teardown
client.on("error", function (err) {
    console.modules("Error " + err);
});

modules.all = function all (filter, cb) {
  filter.status = filter.status || "installed";
  client.hkeys('/modules/' + filter.status, function(err, keys){
    cb(err, keys);
  });
};

modules.checkRegistry = function checkRegistry (package, cb) {

  var start = package.substr(0, 1),
      foundDot = package.search(/\./);

  // TODO: better special char checking
  if ((start === "." || start === "/" || start === "\\") || foundDot !== -1) {
    var str = 'Unable to require modules which aren\'t in the npm registry! \n\n';
    str +=    '    require("' + package + '")\n\n';
    str +=    "A Hook can only consist of a single source file. \n\n";
    str +=    "Any additional files outside of the core Node.js api must be required through npm modules.";
    return cb(new Error(str));
  }

  npm.view(package, function(err, res){
    // TODO: better 404 check, this looks brittle
    if (err === "404 Not Found") {
      var str = 'Cannot find module in the npm registry. \n\n';
      str +=    '    require("' + package + '")\n\n';
      str +=    "This module doesn't exist at https://npmjs.org  \n\n";
      str +=    "Any additional modules outside of the core Node.js api must be required through npm modules.";
      return cb(new Error(str));
    }
    if (err) {
      return cb(new Error('Error communicating with npmjs.org \n\n' + err.message));
    }
    return cb(null);
  });

};

var checkAlready = modules.checkAlready = function checkAlready (package, cb) {
  var found = false;
  var status = "";
  // before installing, check to see if module is pending or already installed
  client.hget("/modules/pending", package, function (err, res){
    if (err) {
      return cb(err);
    }
    if (res !== null) {
      found = true;
      status = "pending";
    }
    client.hget("/modules/installed", package, function (err, res){
      if (err) {
        return cb(err);
      }
      if (res !== null) {
        found = true;
        status = "installed";
      }
      return cb(null, found, status);
    });
  });
}



modules.install = function install (package, cb) {
  
  // only attempt to install modules which are in the registry
  modules.checkRegistry(package, function(err){
    if (err) {
      return cb(err);
    }
    // we previous disallowed re-installs
    // it's better design to not enforce that *here*,
    // better to enforce in calling APIs
    _install();
  });

  function _install () {
    // add module to pending
    modules.addPending(package, function (err, res) {
      if (err) {
        return cb(err);
      }
      // attempt to install module
      npm.spawn(process.stdout, { packages: package }, function (e, result){
        if (e) {
          // TODO: remove from pending, set to error
          return client.hset("/modules/errored", package, "", function (err, res){
            if (err) {
              return cb(err, res);
            }
            return client.hdel("/modules/pending", package, "", function (err, res){
              if (err) {
                return cb(err, res);
              }
              return cb(e, res);
            });
          });
        }
        modules.addInstalled(package, function (err, res){
          if (err) {
            return cb(err);
          }
          client.hdel("/modules/pending", package, "", function (err, res){
            if (err) {
              throw err;
            }
            return cb(null, true);
          });
        });
      });
    });
  };
}

modules.addError = function add (endpoint, cb) {
  function addEntry () {
    // add entry to set
    client.hset("/modules/error", endpoint, "", function (err, res){
      if (err) {
        throw err;
      }
      return cb(err, res);
    });
  };
  return addEntry();
};

modules.addPending = function add (endpoint, cb) {
  function addEntry () {
    // add entry to set
    client.hset("/modules/pending", endpoint, "", function (err, res){
      if (err) {
        throw err;
      }
      return cb(err, res);
    });
  };
  return addEntry();
};

modules.addInstalled = function add (endpoint, cb) {
  function addEntry () {
    // add entry to set
    client.hset("/modules/installed", endpoint, "", function (err, res){
      if (err) {
        throw err;
      }
      return cb(err, res);
    });
  };
  return addEntry();
};