var request = require('hyperdirect')(2);
var path = require('path');
var mkdirp = require('mkdirp'),
    fs = require('fs');

module['exports'] = function fetchHookTheme (opts, url, callback) {
  var owner = opts.owner;

  var themeViewCache = false;

  if (opts.req.hook.mode === "Production") {
    themeViewCache = true;
  }

  var filePath,
      dirPath;

  if (typeof url === "undefined" || url.length === 0) {
    return callback(new Error('Invalid theme url' + url));
  }

  dirPath = url.replace(/\//g, "\\");
  dirPath = dirPath.replace('index.html', '');
  filePath = "index.html";

  var userHome = __dirname + '/../../../temp/' + opts.owner + "/" + opts.req.hook.name + "/views/" + dirPath + "/";

  function readSource () {
    fs.readFile(userHome + filePath, function(err, output) {
      if (err) {
        // if the file can't be found locally, attempt to fetch it anyway
        // WARN: potential infinite loop here?
        return writeSource();
      }
      return callback(null, output.toString());
    });
  };

  function writeSource () {
    request(url, { method: "GET" } ,function(err, res){
      if (err) {
        // no theme, do nothing
        return callback(err);
      }
      var themeHtml = '';
       res.on('data', function(c){
         themeHtml += c.toString();
       });
       res.on('end', function() {
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
       });
    });
  };

  if (themeViewCache) {
    readSource();
  } else {
    writeSource();
  }

}
