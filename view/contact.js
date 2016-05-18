var email = require('resource-email');
var config = require('../config');
var psr = require('parse-service-request');

module['exports'] = function view (opts, callback) {
  var req = opts.req,
      res = opts.res,
      $ = this.$;


  psr(req, res, function(){
    var params = req.resource.params;
    console.log(params)

    if ((typeof params.subject === "string" && typeof params.comment === "string") && (params.subject.length > 0 || params.comment.length > 0)) {
      var _config = {
        //provider: 'sendgrid',
        provider: config.email.provider,
        api_user: config.email.api_user,
        api_key: config.email.api_key,
        to: "contact-hookio@marak.com",
        from: params.email,
        subject: 'hook.io - contact - ' + params.subject,
        html: params.comment
      };

/*
// REMOVE THIS MOCK      
console.log("SENDING", _config);
$('#contactForm').remove();
return callback(null, $.html());
*/

      email.send(_config, function (err, result) {
        if (err) {
          return res.end(err.message);
        }
        // if email is found, send reset password email
        // TODO: send partial email string back to user with ****** to show where email was sent
        // TODO: obfuscate email to client with **** interpolation.
        // console.log('ccc', _config);
        $('#contactForm').remove();
        return callback(null, $.html());
      });
    } else {
      if (typeof params.t === "string") {
        $('#Subject').attr('value', params.t);
      }
      $('.sent').remove();
      return callback(null, $.html());
    }

    /*
    var out = $.html();
    var appName = req.hostname;
    out = out.replace(/\{\{appName\}\}/g, appName);
    */
    

  });

  /*
  email.send({
    //provider: 'sendgrid',
    provider: config.email.provider,
    api_user: config.email.api_user,
    api_key: config.email.api_key,
    to: u.email,
    from: config.app.adminEmail,
    subject: appName + " password reset request",
    html: tmpl
  }, function (err, result) {
    if (err) {
      return res.end(err.message);
    }
    // if email is found, send reset password email
    // TODO: send partial email string back to user with ****** to show where email was sent
    // TODO: obfuscate email to client with **** interpolation.
    res.end('{ "res": "email-sent", "email": "' +  u.email + '"}');
  });
  */
  
  
  //req.i18n.setLocale('de');
};