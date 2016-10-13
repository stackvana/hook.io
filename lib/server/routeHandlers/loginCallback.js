var user = require('../../resources/user');
var metric = require('../../resources/metric');

module['exports'] = function (req, res) {

  var referredBy = req.session.referredBy || "";
  var redirectTo = req.session.redirectTo || "/services";
  // destroy req.session.user in case it's already been set
  delete req.session.user;
  req.session.user = req.user.username.toLowerCase();
  // console.log('assigning sesh', req.user)
  user.find({ name: req.session.user.toLowerCase() }, function (err, result){
    if (err) { 
      return res.end(err.message);
    }
    req.session.paidStatus = "paid";
    // increment total logins metric for user
    // TODO: replace with metric.zincrby for logins metric
    metric.incr("/user/" + req.session.user + "/logins");

    if (result.length === 0) {
      // TODO: this validation should be handled by mschema
      // see: https://github.com/mschema/mschema/issues/9
      // see: https://github.com/mschema/mschema/issues/10
      var mail = "";
      try {
        mail = req.user.emails[0].value || "";
        if (mail === null) { 
          mail = ""; 
        }
      } catch(err) {
        // do nothing
      }
      user.create({
        name: req.session.user,
        email: mail,
        referredBy: referredBy,
        githubAccessToken: req.githubAccessToken
      }, function (err, result){
        if (err) { 
          return res.end(err.message);
        }
        user.emit('login', result);
        req.session.email = result.email;
        return res.redirect(redirectTo);
      })
    } else {
      req.session.paidStatus = result[0].paidStatus;
      req.session.email = result[0].email;
      user.emit('login', result[0]);
      var u = result[0];
      u.githubAccessToken = req.githubAccessToken;
      u.save(function(){
        return res.redirect(redirectTo);
      });
    }

  });

};