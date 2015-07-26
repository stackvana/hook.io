var request = require('hyperquest');
var mkdirp = require('mkdirp');
var fs = require('fs');
var config = require('../../../config');

module['exports'] = function fetchHookSourceCodeFromGithub (opts, callback) {
  var gist = opts.gist || "https://gist.github.com/Marak/357645b8a17daeb17458";
  var userScript =  gist.replace('https://gist.github.com/', '');
  userScript = userScript.replace('/', ' ');
  var parts  = userScript.split(" ");
  var username = parts[0],
      script = parts[1];

  var gistAPI = "https://api.github.com/gists/" + script;

  var cache = false;

  if (opts.req.hook.mode === "Production") {
    cache = true;
  }

  opts.owner = username;
  opts.script = script;
  //var source = gist.replace('https://gist.github.com/', 'https://gist.githubusercontent.com/') + '/raw/';
  //opts.source = source;
  if (opts.req.resource && opts.req.resource.params) {
    opts.req.resource.params.gist = gist;
  }

  var userHome = __dirname + '/../../../temp/' + opts.owner + "/" + opts.req.hook.name + "/";
  var userFile = userHome + opts.script + '.js';

  function readSource () {
    fs.readFile(userFile, function(err, res){
      if (err) {
        // if the file can't be found locally, attempt to fetch it anyway
        // WARN: potential infinite loop here?
        return writeSource();
      } else {
        return callback(err, res.toString());
      }
    });
  };

  function writeSource () {
    // fetch latest version from github gist api
    var options = {
      headers: {
        "User-Agent": "hook.io source code agent"
      }
    };
    if (config.github.accessName && config.github.accessName.length && config.github.accessToken && config.github.accessToken.length) {
      options.headers['Authorization'] = "Basic " + new Buffer(config.github.accessName + ":" + config.github.accessToken, "utf8").toString("base64")
    }
    request.get(gistAPI, options, function (err, apiRes) {
      var apiReply = '';
      apiRes.on('data', function(c){
        apiReply += c.toString();
      });
      apiRes.on('error', function(err){
        return callback(err);
      });
      apiRes.on('end', function(){
        var gistJSON = {}, files, keys;
        try {
          gistJSON = JSON.parse(apiReply.toString());
          files = gistJSON.files;
          keys = Object.keys(files);
        } catch (err) {
          return callback(new Error('Not valid JSON: ' + apiReply));
        }
        // assume first file is the source code
        requestSource(gistJSON.files[keys[0]].raw_url);
      });
      function requestSource (source) {
         request.get(source, function (err, res) {
           if (err) {
             return opts.res.end(err.message);
           }
           var body = '';
           res.on('data', function(c){
             body += c.toString();
           });
           res.on('end', function(){
             var code = body.toString();
             mkdirp(userHome, function(err){
               if (err) {
                 return callback(err);
               }
               // write the code to a temporary file
               fs.writeFile(userFile, code, function(err) {
                 if (err) {
                   return callback(err);
                 }
                 callback(null, code);
               });
             });
           });
        });
      };
    });
  }
  if (cache) {
    readSource();
  } else {
    writeSource();
  }
};
