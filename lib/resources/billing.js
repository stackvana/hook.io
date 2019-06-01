var resource = require('resource');
var billing = resource.define('billing');
var fs = require('fs');

billing.timestamps();

billing.property('name', {
  "type": "string",
  "default": "my-billing",
  "required": true,
  "minLength": 1,
  "maxLength": 50
});

billing.property('amount', {
  "type": "number",
  "required": true,
  "default": 500
});

billing.property('paidUntil', {
  "type": "string",
  "required": false
});

billing.property('plan', {
  "type": "string"
});

billing.property('status', {
  "type": "number",
  "required": true,
  "default": 500
});

billing.property('type', {
  "type": "string",
  "enum": ["Credit Card"],
  "default": "Credit Card"
});

billing.property('stripeID', {
  "type": "string"
});

billing.property('owner', {
  "type": "string",
  "required": true
});

billing.property('email', {
  "type": "string",
  "required": false
});

billing.checkLimits = function checkLimits (cb) {
  findAllUserReports(function(err, results){
    if (err) {
      return cb(err);
    }
    cb(null, results);
  });
};

var config = require('../../config');
var metric = require('../../lib/resources/metric');
var async = require('async');
var user = require('../../lib/resources/user');
user.persist(config.couch);
var util = require('util');
var hgetall = util.promisify(metric.client.hgetall);
var fs = require('fs');
var callbacks = 0;

// TODO: instead of this exhaustive search, instead we will perform a simple query for all user documents which are marked as exceeded and not contacted

// Once we have this list, all we need to do is loop through it and email each user of their status, then set the user document to contacted and with a date
function findAllUserReports (cb) {
  console.log('looking for users');
  let obj = {};
  metric.client.scan(0, 'MATCH', '*/report', 'COUNT', 999999, function (err, re) {
    callbacks = re[1].length;
    // get all the matching keys, now bring documents into memory
    // console.log(err, re[1].length)
    re[1].forEach(function(key){
      metric.client.hgetall(key, function(err, m){
        obj[key] = m;
        callbacks--;
        if (callbacks === 0) {
          cb(null, obj);
          // findExceededLimits(obj);
        }
      });
    })
  })
};

// findUsers();

function findExceededLimits (data, cb) {
  var exceeded = {};
  var callbacks = 0;
  var unpaidUsers = {};
  // find all users who have exceeded 1,000 hits in the past month
  for (var m in data) {
    // TODO: do not hard-code date
    var hits = data[m]['monthlyHits - 2/2019'];
    // TODO: dynamic rate limits per servicePlan
    if (hits > 1000) {
      exceeded[m] = data[m];
    }
  }
  console.log(Object.keys(exceeded).length, 'over 1000 hits')
  callbacks = Object.keys(exceeded).length;
  // now take those users and cross-reference them with users documents to check for paid accounts
  for (let u of Object.keys(exceeded)) {
    //console.log(u)
    var parts = u.split('/');
    var username = parts[2];
    user.findOne({
      name: username
    }, function (err, _user) {
      callbacks--;
      if (err) {
        console.log('error', err);
        return;
      }
      if(_user.paidStatus === 'unpaid') {
        console.log(_user.name, 'is currently', _user.paidStatus);
        unpaidUsers[_user.name] = exceeded[u];
        unpaidUsers[_user.name].email = _user.email;
        // TODO: set user lastAlerted to new Date();
        // TODO: send out correct alert email
        // TODO: 
      }
      if (callbacks === 0) {
        console.log('Need to contact', Object.keys(unpaidUsers).length);
        console.log(unpaidUsers);
        fs.writeFileSync(__dirname + '/../contact-billing.json', JSON.stringify(unpaidUsers, true, 2));
        process.exit();
      }
    })
  }
}

module['exports'] = billing;