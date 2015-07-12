var hook = require('./');
var request = require('hyperquest');
var mkdirp = require('mkdirp');
var fs = require('fs');
var loadPresenter = require('./loadPresenter');

module['exports'] = function fetchHookPresenter (opts, url, callback) {
  var owner = opts.username;

  var themePresenterCache = false;

  if (opts.req.hook.mode === "Production") {
    themePresenterCache = true;
  }

  var filePath,
      dirPath;

  dirPath = url.replace(/\//g, "\\");
  dirPath = dirPath.replace('index.js', '');
  filePath = 'index.js';

  var userHome = __dirname + '/../../../temp/' + opts.username + "/" + opts.req.hook.name + "/presenters/" + dirPath;

  function readSource () {
    loadPresenter(userHome + "/" + filePath, callback);
  };

  function writeSource () {
    request.get(url, function (err, res) {
      if (err) {
        return callback(new Error('Unable to fetch hook presenter at ' + url + '  ' + err.message));
      }
      var body = '';
       res.on('data', function (c){
         body += c.toString();
       });
       res.on('end', function () {

         mkdirp(userHome, function(err) {
           if (err) {
             return callback(err);
           }
           // write the code to a temporary file
           fs.writeFile(userHome + "/" + filePath, body, function(err) {
             if (err) {
               return callback(err);
             }
             loadPresenter(userHome + "/" + filePath, callback);
           });
         });
       });
    });
  };

  if (themePresenterCache) {
    readSource();
  } else {
    writeSource();
  }

};
