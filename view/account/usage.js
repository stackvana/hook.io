var metric = require('../../lib/resources/metric');

module['exports'] = function view (opts, callback) {
  var req = opts.req, res = opts.res, $ = this.$, params = req.resource.params;
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

  metric.get("/" + userName + "/hits", function (err, accountHits) {
    if (err) {
      return res.end(err.message);
    }
    // TODO: check total hits against plan limits,
    // if total hits for user account is exceeded, rate-limit
    // TODO: set json boolean that account is currently over
    
    console.log('metric.' +  userName + '.hits'.green, err, accountHits);
    
    totals.hits = accountHits;
    /*
    // TODO: set json boolean that account is currently over
    
    if (Number(total) >= MAX_SERVICE_CONCURRENCY) {
      // TODO: better error message
      return res.end('max executions per cycle hit, upgrade plan, wait, or request more');
    }
    */

    // TODO: get req.user.plan to determine actual limits ( versus paid / non-paid limits )
    // TODO: reset limits on the start of every month, or at the start of the billing cycle?
    // Get total amount of running hooks for current user
    metric.get("/" +  userName + "/running", function (err, runningServices) {
      if (err) {
        return res.end(err.message);
      }
      totals.running = runningServices;
      if (req.jsonResponse) {
        return res.json(totals);
      } else {
        $('.usage').html(JSON.stringify(totals, true, 2));
        callback(null, $.html());
      }
      
    });
  
  });
};