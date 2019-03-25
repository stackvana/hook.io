module['exports'] = function (opts, callback) {
  var hook = require('../lib/resources/hook');
  //return opts.res.end('fml');
  var $ = this.$, req = opts.req, res = opts.res;
  var appName = req.hostname;

  hook.find({ owner: 'examples', isPublic: true }, function (err, results) {
    if (err) {
      return res.end(err.message);
    }

    if (req.jsonResponse) {
      return res.json(results);
    }

    $ = req.white($);
    return callback(null, $.html());

  });

};

module['exports'].cache = 0;