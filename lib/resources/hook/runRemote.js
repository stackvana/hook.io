var request = require('hyperquest');

// ports of worker pool
var pool = ["10000", "10001", "10002", "10003", "10004"];

module['exports'] = function runRemote (req, res) {

  // Remark: User sessions are sticky to specific hook workers
  // this stickiness is not needed for the app to work ( as workers are stateless ),
  // but is useful for possible caching opportunities
  // and containing bad users who are repeatedly running bad scripts
  //
  if (typeof req.session.worker === "undefined") {
    var w = pool.pop();
    req.session.worker = w;
    pool.unshift(w);
  }
  var _url = 'http://localhost:' + req.session.worker + req.url;

  console.log('about to use worker', _url);

  req.headers["X-Forwarded-For"] = req.connection.remoteAddress;

  var stream = request.post(_url, {
    headers: req.headers
  });

  stream.on('error', function (err){
    console.log('WORKER STREAM ERROR', err)
    // Should we comment out this error handling?
    // do nothing...
    res.write('Error communicating with worker ' + req.session.worker + '\n\n');
    res.end(err.stack)
  });

  req.pipe(stream).pipe(res);

  stream.on('response', function (response) {
    // replay all headers except set-cookie ( to preserve session )
    for (var p in response.headers) {
      // Remark: Don't overwrite the passport session on server
      // This may cause issues with user hooks which intend to modify cookies
      if (p !== "set-cookie") {
        res.setHeader(p, response.headers[p])
      }
    }
    // replay the status code
    res.writeHead(response.statusCode);
  });

};