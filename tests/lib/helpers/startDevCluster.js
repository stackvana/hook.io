var lb = require('../../../lib/load-balancer/load-balancer'),
    web = require('../../../lib/web/web'),
    worker = require('../../../lib/worker/worker'),
    user = require('../../../lib/resources/user');

var config = require('../../../config');

user.persist(config.couch);

module.exports = function start (opts, cb) {
  if (Object.keys(opts) === 0) {
    opts = config;
  }

  if (opts.flushRedis) {
    
    var redis = require("redis"),
        client = redis.createClient(config.redis.port, config.redis.host);

    if (config.redis.password !== null) {
      client.auth(config.redis.password);
    }

    client.on("error", function (err) {
      console.log("Redis Test Error " + err);
    });

    client.flushall(function(){
      client.end();
      beforeAll();
    });
  } else {
    beforeAll();
  }
  
  function beforeAll () {
    if (opts.flushTestUsers) {
      clearTestUsers(function(){
        createTestUsers(function(err, _users){
          start(null, _users);
        })
      })
    } else {
      start();
    }
  }
  
  function start (err, _users) {
    var servers = {};
    lb.start(opts, function(err, app, opts){
      if (err) {
        console.log(err);
        throw err;
      }
      servers['lb'] = app;
      console.log('lb started'.blue, app.server.address())
      web.start(opts, function(err, app){
        if (err) {
          console.log(err);
          throw err;
        }
        servers['web'] = app;
        console.log('web server started'.blue, app.server.address())
        worker.start(opts, function (err, app) {
          if (err) {
            console.log('worker error'.red);
            throw err;
          }
          servers['worker'] = app;
          console.log('worker started'.blue + ' ' + app.server._connectionKey.grey);
          cb(null, { servers: servers, users: _users });
        });
      });
    });
  }

};

function clearTestUsers (cb) {
  user.findOne({ name: 'examples' }, function (err, u) {
    if (u) {
      u.destroy();
    }
    cb();
  });
}
function createTestUsers (cb) {
  user.create({ name: 'examples', email: 'examples@marak.com' }, function (err, userExamples) {
    user.create({ name: 'david', email: 'david@marak.com', paidStatus: 'paid' }, function (err, userDavid) {
      userDavid.password = "asd";
      user.update(userDavid, function (err, david) {
        cb(null, { examples: userExamples, david: david });
      });
    });
  });
}