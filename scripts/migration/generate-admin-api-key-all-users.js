var config = require('../../config');
var cache = require('../../lib/resources/cache');

var user = require('../../lib/resources/user');
var role = require('../../lib/resources/role');
var keys = require('../../lib/resources/keys');
var billing = require('../../lib/resources/billing');
var async = require('async');
var colors = require('colors');
user.persist(config.couch);
keys.persist(config.couch);


// TODO
user.all(function (err, results) {

  if (err) {
    throw err;
  }
  console.log('loading user', results.length)
  async.eachLimit(results, 2, createKey, function(err, re){
    console.log('finished', err, re);
    process.exit();
  })
  var updatedUsers = [];
  var updatedKeys = [];
  function createKey (_user, cb) {
    _user.name = _user.name.toLowerCase();
    //result.githubOauth = true;
    console.log(_user.name);
    keys.findOne({ name: "api-access-key", owner: _user.name }, function (err, k){
      console.log(err)
      if (err) {
        // create a new key
        keys.create({ 
          name: 'api-access-key',
          owner: _user.name,
          key_type: "internal",
          roles: Object.keys(role.roles),
          readOnly: true
        }, function(err, key){
          if (err) {
            console.log(err.message, _user.name)
            return cb();
          } else {
            console.log('created key', key.id);
            user.findOne({name: _user.name }, function(err, u){
              if (err) {
                return cb();
              }
              u.hookAccessKey = key.hook_private_key;
              u.save(function(){
                cb();
              });
              
            });
          }
        }); 
      } else {
        // do nothing, assume has has it
        cb();
      }

    });

  }
});

console.log(role.roles);