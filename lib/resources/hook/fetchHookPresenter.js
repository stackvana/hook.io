var hook = require('./');
var config = require('../../../config');
var request = require('hyperdirect')(2);
var loadPresenter = require('./loadPresenter');
var path = require('path');

module['exports'] = function fetchHookPresenter (opts, url, callback) {
  var owner = opts.owner;
  var h = opts.req.hook;
  var themePresenterCache = false;

  if (opts.req.hook.mode === "Production") {
    themePresenterCache = true;
  }

  var filePath,
      dirPath;

  dirPath = url.replace(/\//g, "\\");
  dirPath = dirPath.replace('index.js', '');
  filePath = 'index.js';

  if (typeof url === "undefined" || url.length === 0) {
    // if no theme, just use default
    url = config.defaultPresenter;
    return cb(null);
  }

  //var userHome = __dirname + '/../../../temp/' + opts.owner + "/" + opts.req.hook.name + "/presenters/" + dirPath;
  var userHome = path.resolve(process.cwd() + '/' + config.tempDirectory + h.owner + "/" + h.name + "/presenters/" + dirPath);

  function readSource () {
    loadPresenter(h.name, function (err, result){
      // if the file can't be found locally, attempt to fetch it anyway
      // WARN: potential infinite loop here?
      if (err !== null) {
        return writeSource();
      } else {
        callback(err, result);
      }
    });
  };

  function writeSource () {
    request(url, { method: "GET" }, function (err, res) {
      if (err) {
        return callback(new Error('Unable to fetch hook presenter at ' + url + '  ' + err.message));
      }
      var body = '';
       res.on('data', function (c){
         body += c.toString();
       });
       res.on('end', function () {
         h.presenterSource = body.toString();
         opts.req.saveHook = true;
         loadPresenter(body.toString(), callback);
       });
    });
  };

  if (themePresenterCache) {
    readSource();
  } else {
    writeSource();
  }

};
