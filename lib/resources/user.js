// default user functionality
var user = require('resource-user');
var metric = require('./metric');

// stores ENV variables for Hooks, these values will map to Hook.env on Hook execution
user.property('env', 'object');

// stores user which referred this user to sign up
user.property('referredBy', 'string');

// user.property('dedicatedSignup', 'object');

user.property('stripeID', 'string');

user.property('domains', ["string"]);

user.property('hostingCredits', 'number');

user.property('emailBlasts', ["string"]);

user.property('githubOauth', "boolean");

// updates metrics for total hook count after creating
user.after('create', function(data, next){
  metric.incr('/user/count');
  next(null, data);
});

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