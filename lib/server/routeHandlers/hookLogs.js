// TODO: move this view to hook.io-logs ?

var log = require('../../resources/log');
var hook = require('../../resources/hook');

var checkRoleAccess = require('./checkRoleAccess');
var config = require('../../../config');

var redis = require("redis"),
    client = redis.createClient(config.redis.port, config.redis.host);

    if (config.redis.password !== null) {
      client.auth(config.redis.password);
    }

// TODO: better error handling and client setup/teardown
client.on("error", function (err) {
    console.log("Error " + err);
});

module['exports'] = function handleHookLogs (req, res) {

  var key = "/hook/" + req.params.owner + "/" + req.params.hook + "/logs";

  // lookup hook based on owner and name, we need to do this in order to check if it's private or not
  var h = { isPrivate: true, owner: req.params.owner };

  req.hook = h;

  var params = req.resource.params;
  var query = { owner: req.params.owner, name: req.params.hook };

  return hook.find(query, function(err, result){

    if (err) {
      return res.end(err.message);
    }
    if (result.length === 0) {
      return res.end('No Hook Found!');
    }

    req.hook = result[0];

    // TODO: move to resource.before hooks
    if (params.flush) {
      return checkRoleAccess({ req: req, res: res, role: "hook::logs::write" }, function (err, hasPermission) {
        if (!hasPermission) {
          return res.end(config.messages.unauthorizedRoleAccess(req, "hook::logs::write"));
        }
        return log.flush('/' + req.params.owner + '/' + req.params.hook, function (err, r) {
          if (err) {
            return res.end(err.message)
          }
          return res.json(r);
        })
      })
    }

    checkRoleAccess({ req: req, res: res, role: "hook::logs::read" }, function (err, hasPermission) {

      // only protect source of private services
      if (req.hook.isPrivate !== true) {
        hasPermission = true;
      }

      if (!hasPermission) {
        return res.end(config.messages.unauthorizedRoleAccess(req, "hook::logs::read"));
      }

      if (req.jsonResponse) {
        res.writeHead(200, {
          'Content-Type': 'text/json'
        });
      } else {
        res.writeHead(200, {
          'Content-Type': 'text/plain'
        });
      }

      // TODO: browser HTML view should show recent logs as static html
      // later, we can add an ajax gateway to populate logs in real-time using logSubcriberClient
      // TODO: in html view give checkbox for enabling auto-refresh of logs

      var isStreaming = false;
      var params = req.resource.params;
      if (req._readableState && req._readableState.buffer && (req._readableState.buffer.length || !req._readableState.ended)) {
        isStreaming = true;
      }

      if (params.streaming === "true") {
        isStreaming = true;
      }

      if (req.headers['accept'] === "*/*" || isStreaming) {
        // Remark: for */* user agent ( such as curl or other applications ),
        // we use logSubcriberClient to create a streaming log endpoint
        var logSubcriberClient = redis.createClient(config.redis.port, config.redis.host);

        if (config.redis.password !== null) {
          logSubcriberClient.auth(config.redis.password);
        }

        logSubcriberClient.on("pmessage", function (pattern, channel, message) {
          try {
            res.write(message + '\n');
          } catch (err) {
            console.log('Error: ' + err.message);
          }
        })
        renderLogs(true);
        logSubcriberClient.psubscribe(key);
      } else if (req.headers['accept'] === "text/plain") {
        renderLogs(false);
      }
      else {
        // TODO: create a View class for log rendering
        if (!req.jsonResponse) {
          res.write('Logs for ' + req.params.owner + "/" + req.params.hook + '\n');
          res.write('Streaming logs can be accessed by running: curl -N https://hook.io/' + req.params.owner + "/" + req.params.hook + "/logs" + '\n\n');
        }
        renderLogs(false);
      }

      function renderLogs () {
        log.recent("/" + req.params.owner + "/" + req.params.hook, function(err, entries){
          if (err) {
            return res.end(err.message);
          }
          if (!isStreaming) {
            res.write(JSON.stringify(entries, true, 2));
          } else {
            entries.forEach(function(entry){
              // backwards compatbility with old database schema
              if (typeof entry === "string") {
                entry = JSON.parse(entry);
              }
              var str;
              if (req.jsonResponse) {
                str = JSON.stringify(entry) + '\n';
              } else {
                str = new Date(entry.time) + ', ' + entry.data + '\n';
              }
              res.write(str);
            });
          }
          if (!isStreaming) {
            res.end();
          }
        });
      };
    });
  });


}
