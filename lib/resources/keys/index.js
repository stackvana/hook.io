/*
  Basic Key store for public / private crypto-keys
  Currently used to manage developer access keys for public / private hooks
*/

var resource = require('resource');
var keys = resource.define('keys');
var config = require('../../../config');
var uuid = require('node-uuid');

var user;

keys.setUser = function (_u){
  user = _u;
};

keys.timestamps();

keys.property('name', {
  "type": "string",
  "default": "my-key-name",
  "required": true,
  "minLength": 1,
  "maxLength": 50
});

keys.property('owner', {
  "type": "string",
  "default": "anonymous",
  "required": true,
  "minLength": 1,
  "maxLength": 50
});

keys.property('hook_public_key', {
  "type": "string",
  "default": "public-" + new Date().getTime()
});

keys.property('hook_private_key', {
  type: 'string',
  label: "Private Key",
  required: true,
  minLength: 1,
  maxLength: 255,
  size: 40,
  private: true
});

keys.property('key_type', {
  "type": "string",
  "enum": ["user", "service", "admin", "internal"],
  "default": "user"
});

keys.property('status', {
  "type": "string",
  "enum": ["active", "expired", "revoked"],
  "default": "active"
});

keys.property('readOnly', {
  "type": "boolean",
  "default": false,
  "description": "determines whether or not the key can be modified or deleted by the owner"
});

keys.property('roles', {
  "type": "string"
  // TODO: make actual array type instead of string
  // "type": "array"
});

keys.before('update', function(data, next){
  if (data.readOnly === true) {
    return next(new Error('Cannot modify this key'), data);
  }
  return next(null, data);
});

keys.before('destroy', function(data, next){
  if (data.readOnly === true) {
    return next(new Error('Cannot modify this key'), data);
  }
  return next(null, data);
});

// only allow 1 key for non-paid accounts
keys.before('create', function (data, next){

  var query = {
    owner: data.owner
  };

  if (typeof data.hook_private_key === "undefined") {
    data.hook_private_key = uuid();
  }

  // TODO: move to more generic paid account check
  user.find({ name: data.owner }, function (err, res){
    if (err) {
      return next(err, data);
    }
    if (res.length === 0) {
      // it's possible during account creation that the user doesn't exist yet
      // allow creation of the key anyway and assume user is coming
      console.log('Warning Keys: generating key for non-existent user');
      return next(null, data);
    }
    var u = res[0];
    var status = u.paidStatus;
    keys.find(query, function (err, res) {
      if (err) {
        return next(err, data);
      }
      var conflicts = null;
      res.forEach(function(i){
        if (i.name === data.name) {
          conflicts = true;
        }
      });
      if (conflicts === true) {
        var msg = "Key name " + data.name + " already exists!";
        return next(new Error(msg), data);
      }
      // don't allow duplicate key names
      if (u.paidStatus === "paid") {
        return next(null, data);
      }
      // one internal key is needed for SDK
      if (res.length > 1) {
        var msg = 'You may not create more than one access key with a non-paid account. \n\nPlease see https://hook.io/pricing for more details.';
        return next(new Error(msg), data);
      }
      next(null, data);
    });
  })

});

module['exports'] = keys;