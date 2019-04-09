var resource = require('resource');
var colors = require('colors');
var cache = require('../cache');
var cron = resource.define('cron');
var config = require('../../../config');
var parser = require('cron-parser');
var util = require('util');

var redis = require('redis'),
  client = redis.createClient(config.redis.port, config.redis.host);

if (config.redis.password !== null) {
  client.auth(config.redis.password);
}

// TODO: better error handling and client setup/teardown
client.on('error', function (err) {
  console.log('Error ' + err);
});

cron.timestamps();

cron.property('name', {
  'type': 'string',
  'default': 'my-key-name',
  'unique': true,
  'required': true,
  'minLength': 1,
  'maxLength': 50
});

cron.property('owner', {
  'type': 'string',
  'default': 'anonymous',
  'required': true,
  'minLength': 1,
  'maxLength': 50
});

cron.property('cronExpression', {
  'type': 'string',
  'default': '* * * * *',
  'required': true,
  'minLength': 1,
  'maxLength': 50
});

cron.property('nextExecutionUnixTime', {
  'type': 'number'
});

cron.property('nextExecutionDate', {
  'type': 'string'
});

cron.property('lastExecutionUnixTime', {
  'type': 'number'
});

cron.property('lastExecutionDate', {
  'type': 'string'
});

cron.property('uri', {
  'type': 'string',
  'required': true,
  'minLength': 1,
  'maxLength': 50
});

cron.property('method', {
  'type': 'string',
  'required': true,
  'default': 'GET',
  'enum': ['GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE']
});

cron.property('params', {
  'type': 'object',
  'required': false,
  'description': 'the payload data which should be sent via the http request ( could be query string / json / form data )'
});

cron.property('status', {
  'type': 'string',
  'default': 'paused',
  'required': true,
  'enum': ['paused', 'running', 'error']
});

cron.getStatus = function getStatus (cb) {
  var now = new Date().getTime() - 60000;
  cron.zrevrangebyscore('crons', now, '-inf', function (err, results) {
    cb(err, results);
  });
};

cron.run = require('./process');

cron.after('update', updateCronCache);
cron.before('update', setNextExecution);

cron.calculateNextExecution = function calculateNextExecution (last, cronExpression) {
  var nextExecutionDate;
  var options = {
    currentDate: last
  };
  var interval = parser.parseExpression(cronExpression, options);
  nextExecutionDate = interval.next();
  /*
  var error = false, next;
  try {
  } catch (err) {
    console.log('Error: ' + err.message);
    error = true;
    // ignore errors, keep going
    // TODO: mark hook as inactive / disabled due to error?
  }
  */
  return nextExecutionDate;
};

function setNextExecution (data, next) {
  var nextExecutionDate = cron.calculateNextExecution(data.lastExecutionUnixTime || new Date(), data.cronExpression);
  data.nextExecutionUnixTime = nextExecutionDate.getTime();
  data.nextExecutionDate = nextExecutionDate;
  next(null, data);
}

cron.setCronCache = function (data, next) {
  // compute next estimate date time
  var nextDate = data.nextExecutionUnixTime;
  var now = new Date();
  data.lastExecutionUnixTime = now.getTime();
  data.lastExecutionDate = now;
  var key = '/' + data.owner + '/' + data.name;
  // add the next computed time into the sorted set of all pending crons
  // ZADD crons NEXT_COMPUTED_DATE_TIME "/cron/marak/cron-test"
  // add the serialized cron item itself into the redis cache
  cache.set('/cron' + key, data, function (err, result) {
    if (err) {
      console.log('error in cache.set crons', err);
    }
    // we can update the cached version without issue, but the sorted set of pending crons must be cleared and re-added everytime
    // failure to remove and re-add this item could cause multiple executions of the cron, or existing active crons toggling to disabled
    cron.zrem('crons', key, function (err, re) {
      // only update the cache and add new items to be processed if the cron is actually active
      if (data.status === 'active') {
        cron.zadd('crons', nextDate, key, function (err, re) {
          if (err) {
            console.log('error in zadd crons', err);
          }
          next(null, data);
        });
      } else {
        next(null, data);
      }
    });
  });
};

function updateCronCache (data, next) {
  cron.setCronCache(data, next);
}

/* resource for keeping metrics on hooks and site usage using redis */

cron.sadd = function (key, value, cb) {
  client.sadd(key, JSON.stringify(value), function (err, result) {
    return cb(err, result);
  });
};

cron.zadd = function (zset, member, value, cb) {
  client.zadd(zset, member, value, function (err, result) {
    return cb(err, result);
  });
};

cron.zrevrangebyscore = function (zset, max, min, cb) {
  var args = [zset, max, min];
  client.zrevrangebyscore(args, function (err, response) {
    cb(err, response);
  });
};

cron.srem = function (set, key, cb) {
  client.srem(set, JSON.stringify(key), function (err, result) {
    return cb(err, result);
  });
};

cron.zrem = function (set, key, cb) {
  client.zrem(set, key, function (err, result) {
    return cb(err, result);
  });
};

cron.spop = function (set, key, cb) {
  client.spop(set, key, function (err, result) {
    return cb(err, result);
  });
};

cron.smembers = function (key, cb) {
  client.smembers(key, function(err, results) {
    results = results.map(function(result){
      try {
        result = JSON.parse(result);
      } catch (err) {
        return cb(err);
      }
      return result;
    });
    return cb(err, results);
  });
};

cron.get = function (key, cb) {
  var _key = '/cron' + key;
  client.get(_key, function (err, reply) {
    return cb(err, JSON.parse(reply));
  });
};

cron.mget = function (keys, cb) {
  client.mget(keys, function (err, result) {
    return cb(err, result);
  });
};

cron.batchGet = function (keys, cb) {
  var _keys = [];
  var result = {};
  // keep metrics keyed into namespace ( so calling method does not need to know /metrics root )
  // this allows /metrics to be configurable in future
  _keys = keys.map(function(k){
    return '/cron' + k;
  });
  client.mget(_keys, function (err, reply) {
    // merge results back into object hash containing keys
    reply.forEach(function(k, i){
      result[keys[Object.keys(keys)[i]]] = JSON.parse(k);
    });
    return cb(err, result);
  });
};

cron.get = util.promisify(cron.get);

cron.set = function (key, data, cb) {
  // TODO: consider HMSET instead of seralization here
  client.set('/cron' + key, JSON.stringify(data), function (err, result) {
    return cb(err, result);
  });
};

cron.del = function (key, cb) {
  client.del('/cron' + key, function (err, result) {
    return cb(err, result);
  });
};

cron.client = client;

module['exports'] = cron;