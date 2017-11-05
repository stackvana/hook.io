var config = require("../config");
var servicePlan = require('../lib/resources/servicePlan');
var user = require('../lib/resources/user');

module['exports'] = function view (opts, callback) {
  var $ = this.$, req = opts.req;
  if (req.session.user !== "anonymous") {
    $('.freeAccount').remove();
  }

  if (req.session && req.session.user && req.session.user !== 'anonymous') {
    user.findOne({ name: req.session.user }, function (err, _u){
      if (err) {
        return res.end(err.message);
      }
      var plan = null, pos = 0, cost;
      _u.servicePlan = _u.servicePlan || 'free';
      Object.keys(servicePlan).forEach(function(key, i){
        if (key === _u.servicePlan) {
          pos = i;
          cost = servicePlan[key].cost;
        }
      })
      // highlight column of current plan
      $($('#colgroup col').get(pos + 1)).addClass('bg-info');
      $($('#colgroup col').get(pos + 1)).addClass('boxShadow');

      // remove buy button from current plan
      $('button', $('.cost td').get(pos + 1)).attr('disabled', 'DISABLED');
      $('button span', $('.cost td').get(pos + 1)).css('background-color', '#000');
      $($('.currentPlan td').get(pos + 1)).html('<strong>Subscribed</strong>');
      finish();
    })
  } else {
    finish();
  }

  //$('#colgroup col')['0'].addClass('bg-info');
  //$('#colgroup col').get(0).addClass('bg-info');

  function finish () {
    $ = req.white($);
    var out = $.html();
    out = out.replace('{{stripePK}}', config.stripe.publicKey);
    callback(null, out);
  }

};