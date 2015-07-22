var gist = {};

gist.create = function (options, cb) {

  options = options || {};
  options.name = options.name || "testHook.js";
  options.description = options.description || 'My first hook.io microservice';
  options.source = options.source || "";
  
  if (typeof options.accessToken === 'undefined') {
    return cb(new Error('Github Access Token is required!'));
  }

  var GitHubApi = require('github');
  var github = new GitHubApi({
      // required
      version: "3.0.0",
      // optional
      debug: false,
      protocol: "https",
      host: "api.github.com",
      requestFormat: "json",
      timeout: 5000
  });

  github.authenticate({
    type: "oauth",
    token: options.accessToken
  });

  var msg = {
    description: options.description,
    public: true,
    files: {
      "testHook.js": {
        content: options.source
      }
    }
  };
  return github.gists.create(msg, function(err, rest) {
    if (err) {
      return cb(err);
    }
    return cb(null, rest);
  });
};


module['exports'] = gist;