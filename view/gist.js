var gist = require('../lib/resources/gist');
var mergeParams = require('./mergeParams');
var bodyParser = require('body-parser');

module['exports'] = function view (opts, callback) {
  var req = opts.request,
      res = opts.response
      $ = this.$;

  $ = req.white($);

  bodyParser()(req, res, function bodyParsed(){
    mergeParams(req, res, function(){
      var params = req.resource.params;
      // if no session, check if source exists
      // if source exists, save it to the current session in new variable
      // set redirect action back to this page with session variable
      if (typeof params.source !== 'undefined') {
        req.session.gistSource = params.source;
      }
      if (!req.isAuthenticated()) {
        req.session.redirectTo = "/gist";
        return res.redirect('/login');
      }
      // check for session, if exists, create gist
      if (req.isAuthenticated() && typeof req.session.gistSource !== 'undefined') {
        $('.gistSplash').remove();
        if (typeof req.session.gistSource !== 'undefined') {
          $('.gistSource').html(req.session.gistSource);
          gist.create({ source: req.session.gistSource, accessToken: req.user.accessToken }, function (err, result){
            if (err) {
              return res.end(err.message);
            }
            req.session.gistLink = result.html_url;
            req.session.gistLink = req.session.gistLink.replace('gist.github.com/', 'gist.github.com/' + req.session.user + "/");
            return res.redirect('/new')
          })
        } else {
          callback(null, $.html());
        }
      } else {
        return res.redirect('/');
        //$('.gistForm').remove();
        //callback(null, $.html());
      }

    });
  });

};