var request = require('hyperquest');
var path = require('path');
var mkdirp = require('mkdirp'),
    fs = require('fs');

module['exports'] = function fetchHookTheme (opts, url, callback) {
  var owner = opts.username;

  var themeCache = false;

  if (opts.req.hook.mode === "Production") {
    themeCache = true;
  }

  request.get(url, function(err, res){
    if (err) {
      // no theme, do nothing
      return callback(err);
    }
    var themeHtml = '';
     res.on('data', function(c){
       themeHtml += c.toString();
     });
     res.on('end', function() {
       var filePath,
           dirPath;

       dirPath = url.replace(/\//g, "\\");
       dirPath = dirPath.replace('index.html', '');
       filePath = "index.html";

       var userHome = __dirname + '/../../../temp/' + opts.username + "/" + opts.req.hook.name + "/";
       if (themeCache === true) {
         fs.readFile(userHome + filePath, function(err, output) {
           if (err) {
             return writeTheme();
           }
           return callback(null, output.toString());
         });
       } else {
         function writeTheme () {
           mkdirp(userHome, function(err){
             if (err) {
               return callback(err);
             }
             // write the code to a temporary file
             fs.writeFile(userHome + filePath, themeHtml, function(err){
               if (err) {
                 return callback(err);
               }
               callback(null, themeHtml);
             });
           });
         }
         writeTheme();
       }
     });
  });
}
