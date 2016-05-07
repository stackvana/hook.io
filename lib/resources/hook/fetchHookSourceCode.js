var request = require('hyperquest');
var config = require('../../../config');
var path = require('path');

module['exports'] = function fetchHookSourceCode (opts, callback) {

  var req = opts.req,
      res = opts.res,
      hook = opts.req.hook;

  var cache = false;
  var source = "gist";
  var username, script, userHome, userFile;

  if (hook.mode === "Production") {
    cache = true;
  }

  // console.log('what is hook', hook)

  // the user's temporary home directory
  // will contain cached versions of Hook and Hook related assets
  userHome = path.resolve(process.cwd() + '/' + config.tempDirectory + hook.owner + "/" + hook.name + "/");
  userName = hook.owner;

  /*
  if (typeof req.hook.source !== "undefined" && req.hook.source.length > 5) {
    source = "hook";
    script = "index";
    //return res.end('custom source' + req.hook.source);
  }
  */

  userFile = userHome + "/" + script + '.js';
  opts.script = script;

  function readSource (cb) {
    // As per https://github.com/bigcompany/hook.io/issues/136, as FS access is removed from worker
    // Instead of loading the code from an additional async source, we now assume that the
    // source has already been loaded on the couchdb document
    if (typeof hook.source === "undefined" || hook.source.length === 0) {
      return fetchAndSaveSource(cb);
    } else {
      // console.log('using cached source', hook.source);
      hook.originalSource = hook.source;
      return callback(null, hook.source);
    }
  };

  function saveSourceToDisk (code, cb) {
    // TODO: save to couchdb now?
    // req.saveHook = true;
    hook.source = code;
    hook.originalSource = code;
    return cb(null, code);
  }

  function fetchRemoteGistSource (cb) {

    var gist = opts.gist || "https://gist.github.com/Marak/357645b8a17daeb17458";
    var userScript =  gist.replace('https://gist.github.com/', '');
    userScript = userScript.replace('/', ' ');
    var parts  = userScript.split(" ");
    var username = parts[0],
        script = parts[1];

    var gistAPI = "https://api.github.com/gists/" + script;

    // Indicate that a change has happened to the hook and it should be saved
    req.saveHook = true;
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
    // console.log('getting gistAPI', gistAPI)
    request.get(gistAPI, options, function (err, apiRes) {
      if (err) {
        return res.end(err.message);
      }
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
        // console.log('getting new hook source', source)
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
            req.hook.source = code;
            // console.log('fetchHookSourceCode setting hook.source', code);
            cb(null, code);
          });
        });
      }
    });
  }

  function fetchSource (cb) {
    if (typeof hook.sourceType === "undefined") {
      hook.sourceType = "code";
      if (typeof hook.source === "undefined" || hook.source.length === 0) {
        if (typeof hook.gist !== "undefined" || hook.gist.length > 0) {
          hook.sourceType = "gist";
        }
      }
    }
    if (hook.sourceType === "gist") {
      fetchRemoteGistSource(cb);
    } else {
      cb(null, hook.source);
    }
  };

  function fetchAndSaveSource (cb) {
    fetchSource(function (err, code) {
      if (typeof code === "undefined") {
        return res.end('fetchandsave Unable to fetch hook source. We made a mistake. Please contact support');
      }
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
