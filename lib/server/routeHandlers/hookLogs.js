var log = require('../../resources/log');

var redis = require("redis"),
    client = redis.createClient();

var logSubcriberClient = redis.createClient();

module['exports'] = function handleHookLogs (req, res) {

  if (typeof req.params.subhook !== "undefined" && req.params.subhook.length) {
    req.params.hook = req.params.hook + "/" + req.params.subhook;
  }

  var key = "/hook/" + req.params.hook + "/" + req.params.owner + "/logs";

  res.writeHead(200, {
   'Content-Type': 'text/plain'
   });
  
  // TODO: browser HTML view should show recent logs as static html
  // later, we can add an ajax gateway to populate logs in real-time using logSubcriberClient

  // TODO: better routing for text/html accept versus text/plain with curl
  // TODO: in html view give checkbox for enabling auto-refresh of logs
  // TODO: don't show anything but logs in text/plain view
  // TOOD: better formatting of date/time

  if (req.headers['accept'] === "*/*") {
    // Remark: for */* user agent ( such as curl or other applications ),
    // we use logSubcriberClient to create a streaming log endpoint
    logSubcriberClient.on("pmessage", function (pattern, channel, message) {
      console.log('get pmessage in view', message);
      res.write(JSON.stringify(message));
    })

    logSubcriberClient.psubscribe(key);
  } else {
    // TODO: create a View class for log rendering
    res.write('Logs for ' + req.params.hook + "/" + req.params.owner + '\n');
    res.write('Streaming logs can be accessed by running: curl -N http://hook.io/' + req.params.hook + "/logs" + '\n\n');
    log.recent("/" + req.params.owner + "/" + req.params.hook, function(err, entries){
      if (err) {
        return res.end(err.message);
      }
      entries.forEach(function(entry){
        entry = JSON.parse(entry);
        var str = entry.time + ' ' + entry.data + '\n';
        res.write(str);
      });
      res.end();
    });    
  }
}
