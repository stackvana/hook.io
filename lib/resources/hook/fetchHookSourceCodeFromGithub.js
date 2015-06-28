var cache = false;

var request = require('hyperquest');
var mkdirp = require('mkdirp');
var fs = require('fs');

module['exports'] = function fetchHookSourceCodeFromGithub (opts, callback) {
  var gist = opts.gist || "https://gist.github.com/Marak/357645b8a17daeb17458";
  var userScript =  gist.replace('https://gist.github.com/', '');
  userScript = userScript.replace('/', ' ');
  var parts  = userScript.split(" ");
  var username = parts[0],
      script = parts[1];
  var source = gist.replace('https://gist.github.com/', 'https://gist.githubusercontent.com/') + '/raw/';
  opts.username = username;
  opts.script = script;
  opts.source = source;
  if (opts.req.resource && opts.req.resource.params) {
    opts.req.resource.params.gist = gist;
  }
  // TODO: if cache, should not request file
  request.get(source, function(err, res){
    if (err) { 
      return opts.res.end(err.message);
    }
    var body = '';
    res.on('data', function(c){
      body += c.toString();
    });
    res.on('end', function(){
      var code = body.toString();
      function writeSource () {
        var userHome = __dirname + '/../../../temp/' + opts.username + "/" + opts.req.hook.name + "/";
        mkdirp(userHome, function(err){
          if (err) {
            return callback(err);
          }
          // write the code to a temporary file
          fs.writeFile(userHome + opts.script + '.js', code, function(err) {
            if (err) {
              return callback(err);
            }
            callback(null, code);
          });
        });
      };
      if (cache) {
        callback();
      } else {
        writeSource();
      }
    });
  });
};
