// default user functionality
var user = require('resource-user');
var metric = require('./metric');
var keys = require('./keys');
var role = require('./role');
var servicePlan = require('./servicePlan');
var timezone = require('timezone-support');

user.property('timezone', {
  type: "string",
  enum: timezone.listTimeZones()
});

// stores ENV variables for Hooks, these values will map to Hook.env on Hook execution
user.property('env', 'object');

// stores user which referred this user to sign up
user.property('referredBy', 'string');

// user.property('dedicatedSignup', 'object');
user.schema.properties.name.required = false;
user.schema.properties.email.required = true;
user.schema.properties.password.required = false;

user.property('stripeID', 'string');

user.property('domains', ["string"]);

user.property('paidStatus', {
  type: "string",
  default: "unpaid"
});

user.property('servicePlan', {
  type: "string",
  default: "trial"
});

user.property('hostingCredits', 'number');

user.property('emailBlasts', ["string"]);

user.property('githubOauth', "boolean");
user.property('githubAccessToken', "string");

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

user.method('login', function (opts, cb) {
  var res = opts.res,
      req = opts.req;
  var u = opts.user;

  if (typeof u.name === 'undefined') {
    // if no user name is available, it means the account has been created but no user name is regsitered yet
    // login the user and don't perform key creation logic until later ( registering account should re-trigger login event )
    return _login();
  }
  // check if internal API key exists
  var apiKeyQuery = {
    name: "api-access-key",
    owner: u.name.toLowerCase()
  };

  // will only create key if it doesn't already exist
  keys.findOne(apiKeyQuery, function (err, key) {
    // if no key was found, create a new one
    if (err) {
      apiKeyQuery.id = u.id;
      createInternalApiKey(apiKeyQuery, _login);
      return;
    }
    // If key was found but not attached to user, re-attach the key to the user
    // Note: This shouldn't happen often outside of testing or manually adjusting user
    if (typeof u.hookAccessKey === 'undefined' || u.hookAccessKey.length < 5) {
      var _update = {
        id: u.id,
        hookAccessKey: key.hook_private_key
      };
      user.update(_update, function (err, re) {
        if (err) {
          console.log('Error: ', err.message);
        }
        _login();
      });
    } else {
      _login();
    }
  });

  function _login () {

    // Remark: Filter the user object to reduce session size and,
    //         also so we don't leak any potentially sensitive information into session redis cache
    var filteredUser = user.filter(u);

    // free accounts are now trial accounts
    if (filteredUser.servicePlan === 'free') {
      filteredUser.servicePlan = 'trial';
    }

    // perform passport login logic, this will populate req.user scope
    req.login(filteredUser, function (err, profile) {
      if (err) {
        return cb(err);
      }
      if (typeof u.name === 'string' && u.name.length > 0) {
        req.session.user = u.name.toLowerCase();
      }

      req.session.user_ctime = u.ctime;

      req.session.email = u.email;
      // is result.hookAccessKey ever defined here?
      req.session.hookAccessKey = u.hookAccessKey;

      // set information about current user's current plan and limits
      // this is useful for displaying this data without needing to make additional requests to the database later
      req.session.paidStatus = u.paidStatus;
      req.session.servicePlan = u.servicePlan || 'free';
      req.session.timezone = u.timezone;
      req.session.serviceLimits = servicePlan[u.servicePlan];

      cb(null);
    });
  }

});

// when a user registers an account name
user.on('register', function (data) {
  // TODO: create a new subdomain for that user ?
  // Remark: Instead of automatically adding subdomains, allow user to register it easily
});

user.filter = function (u) {
  var _user = {};
  ['name', 'email', 'status', 'paidStatus', 'servicePlan', 'hookAccessKey', 'stripeID'].forEach(function (key) {
    _user[key] = u[key];
  });
  return _user;
};

function createInternalApiKey (data, cb) {
  // console.log('calling createInternalApiKey', data)
  keys.create({
    name: "api-access-key",
    owner: data.owner,
    key_type: "internal",
    roles: Object.keys(role.roles)
  }, function(err, k) {
    if (err) {
      console.log('Error: ', err.message);
      return;
      //return next(err);
    }
    var _update = {
      id: data.id,
      hookAccessKey: k.hook_private_key
    };
    // console.log('attemping to update user', _update)
    user.update(_update, function(err, re){
      if (err) {
        console.log('Error: ', err.message);
      }
      cb(null, re);
    });
  });
}

/*
user.after('create', function (data, next) {
  // fire and forget the key creation
  next(null, data);
  //createInternalApiKey(data);
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