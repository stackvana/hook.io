var hook = require('./');

var themeCache = false;

var request = require('hyperquest');
var mkdirp = require('mkdirp');
var fs = require('fs');
var loadPresenter = require('./loadPresenter');


module['exports'] = function fetchHookPresenter (url, callback) {
  request.get(url, function (err, res) {
    if (err) {
      return callback(err);
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

       var path = __dirname + '/../../../temp/' + dirPath + "/" + filePath;

       if (themeCache === true) {
         loadPresenter(path, callback);
       } else {
         mkdirp(__dirname + '/../../../temp/' + dirPath, function(err){
           if (err) {
             return callback(err);
           }
           // write the code to a temporary file
           fs.writeFile(__dirname + '/../../../temp/' + dirPath + "/" + filePath, body, function(err){
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
