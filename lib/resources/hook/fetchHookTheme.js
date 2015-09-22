var request = require('hyperdirect')(2);
var path = require('path');
var config = require('../../../config');

module['exports'] = function fetchHookTheme (opts, url, callback) {

  var owner = opts.owner;
  var h = opts.req.hook;
  var themeViewCache = false;

  if (opts.req.hook.mode === "Production") {
    themeViewCache = true;
  }

  var filePath,
      dirPath;

  if (typeof url === "undefined" || url.length === 0) {
    // if no theme, just use default
    url = config.defaultTheme;
  }

  dirPath = url.replace(/\//g, "\\");
  dirPath = dirPath.replace('index.html', '');
  filePath = "index.html";

  //var userHome = __dirname + '/../../../temp/' + opts.owner + "/" + opts.req.hook.name + "/views/" + dirPath + "/";
  var userHome = path.resolve(process.cwd() + '/' + config.tempDirectory + opts.req.hook.owner + "/" + opts.req.hook.name + "/views/" + dirPath + "/");

  function readSource () {
    if (typeof opts.req.hook.viewSource !== 'undefined' && opts.req.hook.viewSource.length > 0) {
      return callback(null, opts.req.hook.viewSource);
    } else {
      return writeSource();
    }
  };

  function writeSource () {
    // console.log('getting new theme', url)
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
         h.presenterSource = themeHtml.toString();
         opts.req.saveHook = true;
         callback(null, themeHtml.toString());
       });
    });
  };

  if (themeViewCache) {
    readSource();
  } else {
    writeSource();
  }

}
