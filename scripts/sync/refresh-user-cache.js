var config = require('../../config');
var cache = require('../../lib/resources/cache');
var async = require('async');
var user = require('../../lib/resources/user');
user.persist(config.couch);

user.all(function (err, results) {
  if (err) {
    throw err;
  }
  console.log('found users', results.length);
  async.eachLimit(results, 80, updateUserCache, function (err, re){
    console.log('finished', err, re);
    process.exit();
  });
  function updateUserCache (_user, cb) {
    console.log('updating user', _user.name);
    user.setCache(_user, cb);
  }
});