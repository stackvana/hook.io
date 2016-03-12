// default user functionality
var user = require('resource-user');
var metric = require('./metric');
var keys = require('./keys');
var role = require('./role');

// stores ENV variables for Hooks, these values will map to Hook.env on Hook execution
user.property('env', 'object');

// stores user which referred this user to sign up
user.property('referredBy', 'string');

// user.property('dedicatedSignup', 'object');

user.property('stripeID', 'string');

user.property('domains', ["string"]);

user.property('paidStatus', {
  type: "string",
  default: "unpaid"
});

user.property('hostingCredits', 'number');

user.property('emailBlasts', ["string"]);

user.property('githubOauth', "boolean");

user.property('hookAccessKey', {
  "type": "string",
  "required": false,
  "description": "cached version of the pre-generated admin-access-key used for hook-services"
});

// updates metrics for total hook count after creating
user.after('create', function(data, next){
  metric.incr('/user/count');
  next(null, data);
});

/*
user.after('create', function (data, next){
  keys.create({
    name: "admin-access-key",
    owner: data.name,
    roles: Object.keys(role.roles)
  }, function(err, k) {
    if (err) {
      console.log('Error: ', err.message);
      return next(err);
    }
    data.hookAccessKey = k.hook_private_key;
    user.update(data, function(err, re){
      if (err) {
        console.log('Error: ', err.message);
      }
    });
  });
  // fire and forget the key creation
  next(null, data);
});
*/

user.before('create', function (_user, next) {

  if(typeof _user.name === "string") {
    _user.name = _user.name.toLowerCase();
  }

  // Since we use "anonymous" as the default session name for all non-authenticated users...
  // it would cause some trouble if we allowed someone to register a user account with the name "anonymous"
  // do not remove...
  if (_user.name === "anonymous") {
    return next(new Error('Sorry! "anonymous" is a reserved account name.'))
  }

  next(null, _user);
});

user.before('update', function (_user, next) {
  if(typeof _user.name === "string") {
    _user.name = _user.name.toLowerCase();
  }
  next(null, _user);
});

// ctime and mtime time stamps
user.timestamps();

module['exports'] = user;