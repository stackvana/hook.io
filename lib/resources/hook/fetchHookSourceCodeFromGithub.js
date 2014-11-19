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
      if (cache) {
        callback();
      } else {
        mkdirp(__dirname + '/../../../temp/' + opts.username, function(err){
          if (err) {
            return callback(err);
          }
          // write the code to a temporary file
          fs.writeFile(__dirname + '/../../../temp/' + opts.username + "/" + opts.script + '.js', code, function(err){
            if (err) {
              return callback(err);
            }
            callback(null, code);
          });
        });
      }
    });
  });
};
