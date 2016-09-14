var metric = require('../../lib/resources/metric');

module['exports'] = function view (opts, callback) {
  var req = opts.req, $ = this.$, params = req.resource.params;
  var out = $.html();

  // TODO: replace with API access key code
  // if not logged in, kick out
  if (!req.isAuthenticated()) { 
    req.session.redirectTo = "/account/usage";
    // TODO: actual login screen, not just homepage login
    //return callback(null, $.html());
    return res.redirect('/login');
  }

  var totals = {};

  var userName = req.session.user.toLowerCase();
  
  // admin override allows checking usage stats of all users
  if (params.user && userName.toLowerCase() === "marak") {
    userName = params.user.toLowerCase();
  }
  console.log('getting metrics for'.yellow, userName)

  metric.set("/" + userName + "/hits", 0, function (err, status) {
    if (err) {
      return res.end(err.message);
    }
    // console.log('metric.' +  userName + '.hits'.green, err, accountHits);
    
    // totals.hits = accountHits;

    metric.set("/" +  userName + "/running", 0, function (err, runningServices) {
      if (err) {
        return res.end(err.message);
      }
      if (req.jsonResponse) {
        return res.json({ status: 'reset' });
      } else {
        callback(null, 'Reset!');
      }
      
    });
  
  });
};