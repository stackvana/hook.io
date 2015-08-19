var log = require('../../resources/log');

var redis = require("redis"),
    client = redis.createClient();

module['exports'] = function handleHookLogs (req, res) {

  var key = "/hook/" + req.params.owner + "/" + req.params.hook + "/logs";

  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });

  // TODO: browser HTML view should show recent logs as static html
  // later, we can add an ajax gateway to populate logs in real-time using logSubcriberClient
  // TODO: in html view give checkbox for enabling auto-refresh of logs

  if (req.headers['accept'] === "*/*") {
    // Remark: for */* user agent ( such as curl or other applications ),
    // we use logSubcriberClient to create a streaming log endpoint
    var logSubcriberClient = redis.createClient();
    logSubcriberClient.on("pmessage", function (pattern, channel, message) {
      res.write(message + '\n');
    })
    renderLogs(true);
    logSubcriberClient.psubscribe(key);
  } else if (req.headers['accept'] === "text/plain") {
    renderLogs(false);
  }
  else {
    // TODO: create a View class for log rendering
    res.write('Logs for ' + req.params.owner + "/" + req.params.hook + '\n');
    res.write('Streaming logs can be accessed by running: curl -N https://hook.io/' + req.params.owner + "/" + req.params.hook + "/logs" + '\n\n');
    renderLogs(false);
  }

  function renderLogs (isStreaming) {
    log.recent("/" + req.params.owner + "/" + req.params.hook, function(err, entries){
      if (err) {
        return res.end(err.message);
      }
      entries.forEach(function(entry){
        entry = JSON.parse(entry);
        var str = new Date(entry.time) + ', ' + entry.data + '\n';
        res.write(str);
      });
      if (!isStreaming) {
        res.end();
      }
    });
  };

}
