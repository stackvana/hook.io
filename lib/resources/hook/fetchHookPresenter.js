var hook = require('./');

var themeCache = false;

var request = require('hyperquest');
var mkdirp = require('mkdirp');
var fs = require('fs');
var loadPresenter = require('./loadPresenter');


module['exports'] = function fetchHookPresenter (opts, url, callback) {
  var owner = opts.username;
  request.get(url, function (err, res) {
    if (err) {
      return callback(new Error('Unable to fetch hook presenter at ' + url + '  ' + err.message));
    }
    var body = '';
     res.on('data', function (c){
       body += c.toString();
     });
     res.on('end', function () {
       var filePath,
           dirPath;

       dirPath = url.replace(/\//g, "\\");
       dirPath = dirPath.replace('index.js', '');
       filePath = "index.js";

       var userHome = __dirname + '/../../../temp/' + opts.username + "/" + opts.req.hook.name + "/";
       var path = userHome + filePath;

       if (themeCache === true) {
         loadPresenter(path, callback);
       } else {
         mkdirp(userHome, function(err) {
           if (err) {
             return callback(err);
           }
           // write the code to a temporary file
           fs.writeFile(userHome + filePath, body, function(err) {
             if (err) {
               return callback(err);
             }
             loadPresenter(path, callback);
           });
         });
       }
     })

  })
};
