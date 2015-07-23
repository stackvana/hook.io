var datastore = {};

// TODO: make this contstant a variable on the user document
var MAX_DOCUMENTS_PER_USER = 1000;

/* simple caching resource that uses redis */
var redis = require("redis"),
    client = redis.createClient();

// TODO: better error handling and client setup/teardown
client.on("error", function (err) {
    console.log("Error " + err);
});

datastore.Datastore = function (opts) {
  var self = this;
  opts = opts || {};
  opts.root = opts.root || "anonymous";
  self.root = opts.root;
  return self;
};

datastore.Datastore.prototype.recent = function (cb) {

  var self = this;

  var MAX = 5;

  var cursor = '0';
  var results = [];
  
  function _finish() {
    var r = results;
    r = r.map(function(a){
      a = a.replace('/ds/' + self.root + "/", '');
      return a;
    });
    return cb(null, r);
  }

  function scan () {
    client.scan(
      cursor,
      "MATCH", "*/ds/" + self.root + "/*",
      "COUNT", 100, // TODO: actually use cursor scan... i think this will only check last 1000 block of records...
      function(err, res) {
        if (err) {
          return cb(err);
        }
        cursor = res[0];
        res[1].forEach(function(i){
          results.push(i);
          if (results.length >= MAX) {
            return _finish();
          }
        });
        if (cursor === '0') {
          return _finish();
        }
      });
    
  };
  scan();
};

datastore.Datastore.prototype.del = function (key, cb) {
  var self = this;
  client.del('/ds/' + self.root + "/" + key, cb);
};

datastore.Datastore.prototype.exists = function (key, cb) {
  var self = this;
  client.exists('/ds/' + self.root + "/" + key, cb);
};

datastore.Datastore.prototype.set = function (key, data, cb) {
  var self = this;

  self.exists(key, function (err, _exists){
    if (err) {
      return cb(err);
    }
    if (_exists === 0) {
      checkLimit();
    } else {
      _set();
    }
  })


  // before a set can be performed, check if we have hit the MAX_DOCUMENTS_PER_USER limit per user
  function checkLimit () {

    var cursor = '0';
    // scan 0 match  */ds/Marak/* count 1000
    var results = [];

    function _finish() {
      var r = results;
      r = r.map(function(a){
        a = a.replace('/ds/' + self.root + "/", '');
        return a;
      });
      return cb(null, r);
    }

    function _scan () {
      client.scan(
        cursor,
        "MATCH", "*/ds/" + self.root + "/*",
        "COUNT", 100, // TODO: actually use cursor scan... i think this will only check last 1000 block of records...
        function (err, res) {
          if (err) {
            return cb(err);
          }
          cursor = res[0];
          if (cursor === '0') {
            // made it to 0 cursor without hitting MAX_DOCUMENTS_PER_USER,
            // add a new key
            return _set();
          }
          res[1].forEach(function(i){
            results.push(i);
            if (results.length >= MAX_DOCUMENTS_PER_USER) {
              return cb(new Error('Document Quota Exceeded!'));
            }
          });
          _scan();
        });
    };
    _scan();
  };

  function _set () {
    // MAX_DOCUMENTS_PER_USER limit not hit, add document
    // TODO: consider HMSET instead of seralization here
    client.set('/ds/' + self.root + "/" + key, JSON.stringify(data), function(err, result){
      return cb(err, result);
    });
  }

};

datastore.Datastore.prototype.get = function (key, cb) {
  var self = this;
  // TODO: consider HMSET / HMGET and not using  of serialization here
  client.get('/ds/' + self.root + "/" + key, function(err, reply){
    if (reply !== null) {
      reply = JSON.parse(reply);
    }
    return cb(err, reply);
  });
};

module['exports'] = datastore;