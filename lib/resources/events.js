var config = require('../../config');
var resource = require('resource');

var events = resource.define('events');

module['exports'] = events;

var eventsSubcriberClient;
var MAX_EVENTS_PER_USER = 50;
var redis = require("redis");
var client;
require('colors');

/*

TODO

// datastore role access currently being handled in view, this is wrong, and should be moved to datastore.js resource methods
datastore::get
datastore::set
datastore::del
datastore::exists
datastore::recent

domain::create
domain::find
domain::update
domain::destroy


Done

    ✓ hook::created
    ✓ hook::destroy
    ✓ hook::update

    ✓  hook::package::read
    ✓  hook::presenter::read
    ✓  hook::resource::read
    ✓  hook::run
    ✓  hook::source::read
    ✓  hook::view::read

    ✓  env::read
    ✓  env::write

Don't track

  events::read
  events::write

  hook::logs::read
  hook::logs::write


*/

// TODO: need to fix resource-forms in /keys page
// keys::create
// keys::destroy

resource.on('keys::created', function(data){
  console.log('keys created'.green, data)
  console.log("SERVICE EVENT".red, data);
  events.push('/' + data.owner, {
    "type": "keys::created",
    "time": new Date(),
    "data": data
  });
});

resource.on('hook::created', function(data){
  console.log('hook created'.green, data)
  console.log("SERVICE EVENT hook::created".red, data);
  events.push('/' + data.owner, {
    "type": "hook::created",
    "time": new Date(),
    "ip": data.ip
  });
});

resource.on('hook::updated', function(data){
  console.log('hook updated'.green, data)
  console.log("SERVICE EVENT hook::updated".red, data);
  events.push('/' + data.owner, {
    "type": "hook::updated",
    "time": new Date(),
    "ip": data.ip
  });
});

resource.on('hook::destroyed', function(data){
  console.log('hook destroyed'.green, data)
  console.log("SERVICE EVENT hook::destroyed".red, data);
  events.push('/' + data.owner, {
    "type": "hook::destroyed",
    "time": new Date(),
    "ip": data.ip
  });
});

resource.on('hook::run', function (data) {
  console.log("SERVICE EVENT hook::run".red, data);
  events.push('/' + data.owner, {
    "type": "hook::run",
    "time": new Date(),
    "ip": data.ip,
    "url": data.url
  });
});

resource.on('hook::source::read', function (data) {
  console.log("SERVICE EVENT - hook::source::read".red, data);
  events.push('/' + data.owner, {
    "type": "hook::source::read",
    "time": new Date(),
    "ip": data.ip,
    "url": data.url
  });
});

resource.on('hook::presenter::read', function (data) {
  console.log("SERVICE EVENT - hook::presenter::read".red, data);
  events.push('/' + data.owner, {
    "type": "hook::presenter::read",
    "time": new Date(),
    "ip": data.ip,
    "url": data.url
  });
});

resource.on('hook::view::read', function (data) {
  console.log("SERVICE EVENT - hook::view::read".red, data);
  events.push('/' + data.owner, {
    "type": "hook::view::read",
    "time": new Date(),
    "ip": data.ip,
    "url": data.url
  });
});

resource.on('hook::package::read', function (data) {
  console.log("SERVICE EVENT - hook::package::read".red, data);
  events.push('/' + data.owner, {
    "type": "hook::package::read",
    "time": new Date(),
    "ip": data.ip,
    "url": data.url
  });
});

resource.on('hook::resource::read', function (data) {
  console.log("SERVICE EVENT - hook::resource::read".red, data);
  events.push('/' + data.owner, {
    "type": "hook::resource::read",
    "time": new Date(),
    "ip": data.ip,
    "url": data.url
  });
});



resource.on('keys::authAttempt', function (data) {
  console.log("SERVICE EVENT keys::authAttempt".red, data);
  events.push('/' + data.owner, {
    "type": "keys::authAttempt",
    "name": data.name,
    "time": new Date(),
    "ip": data.ip,
    "owner": data.owner,
    "hasAccess": data.hasAccess
  });
});

resource.on('env::write', function (data) {
  console.log("SERVICE EVENT env::write".red, data);
  events.push('/' + data.owner, {
    "type": "env::write",
    "time": new Date(),
    "ip": data.ip
  });
});

resource.on('env::read', function (data) {
  console.log("SERVICE EVENT env::read".red, data);
  events.push('/' + data.owner, {
    "type": "env::read",
    "time": new Date(),
    "ip": data.ip
  });
});

events.start = function (opts) {

  client = redis.createClient(opts.port, opts.host);

  if (config.redis.password !== null) {
    client.auth(config.redis.password);
  }

  eventsSubcriberClient = redis.createClient(opts.port, opts.host);

  if (config.redis.password !== null) {
    eventsSubcriberClient.auth(config.redis.password);
  }

  // TODO: better error handling and client setup/teardown
  client.on("error", function (err) {
      console.log("Error " + err);
  });

  // TODO: better error handling and client setup/teardown
  eventsSubcriberClient.on("error", function (err) {
      console.log("Error " + err);
  });
}

events.flush = function (endpoint, cb) {
  // TODO: removes all events from the endpoint
  // TODO: run this every day or so to remove old events
  
};

events.recent = function (endpoint, cb) {
  // gets the most recent events for endpoint
  client.lrange("/user" + endpoint + "/events", 0, MAX_EVENTS_PER_USER, function(err, results){
    // show events in reverse order
    var parsed = [];
    results.forEach(function(item){
      parsed.push(JSON.parse(item));
    });
    
    parsed = parsed.reverse();
    return cb(err, parsed);
  });
};

events.stream = function (outputStream) {
  // tails the most recent events entries for user
};

events.push = function push (endpoint, entry, cb) {
  // Before adding a new entry we must check if endpoint has exceeded MAX_LOGS_PER_HOOK
  // if so, then pop the last item from the list before adding a new item
  events._count("/user" + endpoint + "/events", function(err, res){
    if (err) {
      return cb(err);
    }
    if (res >= MAX_EVENTS_PER_USER) {
      // console.log("Max events entries hit!");
      return removeLastEntry();
    } else {
      return addEntry();
    }
  });

  function addEntry () {
    // add entry to set
    client.rpush("/user" + endpoint + "/events", JSON.stringify(entry), function (err, res){
      if (err) {
        return cb(err);
      }
      //console.log('pushing to', "/user" + endpoint + "/events")
      eventsSubcriberClient.publish("/user" + endpoint + "/events", JSON.stringify(entry));
    });
  };

  function removeLastEntry () {
    client.lpop("/user" + endpoint + "/events", function (err, result){
      if (err) {
        return cb(err);
      }
      addEntry();
    });
  };

};

// gets the amount of events currently keyed to endpoint
events._count = function (endpoint, cb) {
  client.llen(endpoint, function (err, res){
    if (err) {
      return cb(err);
    }
    cb(null, res);
  })
};

events.start({
  port: config.redis.port,
  host: config.redis.host
});