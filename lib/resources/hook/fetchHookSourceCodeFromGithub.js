var request = require('hyperquest');
var mkdirp = require('mkdirp');
var fs = require('fs');
var config = require('../../../config');

module['exports'] = function fetchHookSourceCodeFromGithub (opts, callback) {

  var req = opts.req,
      res = opts.res,
      hook = opts.req.hook;

  var cache = false;
  var source = "gist";
  var username, script, userHome, userFile;

  if (hook.mode === "Production") {
    cache = true;
  }

  // the user's temporary home directory
  // will contain cached versions of Hook and Hook related assets
  userHome = __dirname + '/../../../temp/' + hook.owner + "/" + hook.name + "/";
  userName = hook.owner;

  if (typeof req.hook.source !== "undefined" && req.hook.source.length > 5) {
    source = "hook";
    script = "index";
    //return res.end('custom source' + req.hook.source);
  }

  if (source === "gist") {
    var gist = opts.gist || "https://gist.github.com/Marak/357645b8a17daeb17458";
    var userScript =  gist.replace('https://gist.github.com/', '');
    userScript = userScript.replace('/', ' ');
    var parts  = userScript.split(" ");
    var username = parts[0],
        script = parts[1];

    var gistAPI = "https://api.github.com/gists/" + script;
  }

  userFile = userHome + script + '.js';
  opts.script = script;

  function readSource (cb) {
    /*
      attempt to read the source code from disk
      if the source cannot be found on the disck, it will attempt to refetch the source
    */
    fs.readFile(userFile, function(err, res){
      if (err) {
        // if the file can't be found locally, attempt to fetch it anyway
        // WARN: potential infinite loop here?
        return fetchAndSaveSource();
      } else {
        return cb(null, res.toString());
      }
    });
  };

  function saveSourceToDisk (code, cb) {
    /*
     write the code to a temporary file on server, this is useful for a few reasons:
      - provides authoritative source of code for debugging
      - allows usage of standard node.js require() call ( keeps its simple )
      - allows for more robust caching ( would be possible to run hook when database is down )
    */
    mkdirp(userHome, function(err){
      if (err) {
        return cb(err);
      }
      fs.writeFile(userFile, code, function (err) {
        if (err) {
          return cb(err);
        }
        cb(null, code);
      });
    });
  }

  function fetchRemoteGistSource (cb) {
    /*
      fetches the latest version of source code from remote Github Gist Source
      requires a valid and correctly formatted link to a github gist URL
    */
    var options = {
      headers: {
        "User-Agent": "hook.io source code agent"
      }
    };
    // must validate request. github API limits requests per hour. non-authorizated HTTP requests cap out quickly.
    // warning: in the future, we might have to ask github to increase our API limit / create several access tokens
    if (config.github.accessName && config.github.accessName.length && config.github.accessToken && config.github.accessToken.length) {
      options.headers['Authorization'] = "Basic " + new Buffer(config.github.accessName + ":" + config.github.accessToken, "utf8").toString("base64")
    }
    request.get(gistAPI, options, function (err, apiRes) {
      var apiReply = '';
      apiRes.on('data', function (c) {
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
            cb(null, code);
          });
        });
      }
    });
  }

  function fetchSource (cb) {
    if (source === "gist") {
      fetchRemoteGistSource(cb);
    } else {
      cb(null, hook.source);
    }
  };

  function fetchAndSaveSource (cb) {
    fetchSource(function (err, code) {
      saveSourceToDisk(code, cb);
    });
  }

  if (cache) {
    // if cache is enabled for Hook, attempt to read the temporary source file
    readSource(callback);
  } else {
    // if no cache is enabled, fetch the source code and save it as a local temporary file
    fetchAndSaveSource(callback);
  }

};
