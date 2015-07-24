var user = require('../../resources/user');
var metric = require('../../resources/metric');

module['exports'] = function (req, res) {

  var referredBy = req.session.referredBy || ""; 
  req.session.user = req.user.username;
  user.find({ name: req.user.username }, function (err, result){
    if (err) { 
      return res.end(err.message);
    }

    // increment total logins metric for user
    metric.incr("/user/" + req.user.username + "/logins");

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
      user.create({ name: req.user.username, email: mail, referredBy: referredBy }, function(err, result){
        if (err) { 
          return res.end(err.message);
        }
        return res.redirect(req.session.redirectTo || "/");
      })
    } else {
      return res.redirect(req.session.redirectTo || "/");
    }

  });

};