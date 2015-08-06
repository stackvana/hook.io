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

modules.install = function install (package, cb) {
  function checkRegistry (package, cb) {
    npm.view(package, function(err, res){
      if (err) {
        return cb(new Error(package + ' was not in npmjs.org registry. Cannot install.'));
      }
      return cb(null);
    });
  };

  function checkAlready (cb) {
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

  checkRegistry(package, function(err){
    if (err) {
      return cb(err);
    }
    checkAlready(function(err, exists, status){
      if (err) {
        return cb(err);
      }
      if (exists) {
        return cb(new Error(package + ' already exists and is ' + status));
      }
      _install();
    });
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