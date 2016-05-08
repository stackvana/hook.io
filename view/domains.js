var forms = require('resource-forms'),
mschemaForms = require('mschema-forms');

var mergeParams = require('./mergeParams');
var bodyParser = require('body-parser');
var domain = require('../lib/resources/domain');

module['exports'] = function view (opts, callback) {

   var req = opts.request,
       res = opts.response,
       $ = this.$;

   var appName = req.hostname;

 /*
 // if not logged in, kick out
 if (!req.isAuthenticated()) {
   $('.domains').remove();
   req.session.redirectTo = "/domains";
   return callback(null, $.html());
   //return res.redirect('/login');
 } else {
   $('.loginBar').remove();
 }
 */

 bodyParser()(req, res, function bodyParsed() {
   mergeParams(req, res, function (){});

   req.resource.params.owner = req.session.user;

   var middle = forms.generate({
      view: 'grid-with-form',
      resource: domain,
      action: '/domains',
      req: req,
      res: res,
      params: req.resource.params,
      query: { owner: req.session.user },
      useLayout: false,
      form: {
        create: {
          legend: 'Add a new Domain or Subdomain',
          submit: "Add Entry"
        },
        grid: {
          legend: 'Your Domains'
        }
      },
      schema: {
        name: {
          type: 'string',
          description: 'Your custom domain name. Example: marak.com',
          placeholder: 'marak.com',
          required: true,
          minLength: 1,
          maxLength: 50
        },
        forwardUrl: {
          type: 'string',
          label: "hook",
          placeholder: "/Marak/echo",
          description: 'The Service to point your domain to. Example: /Marak/echo',
          required: true,
          minLength: 1,
          maxLength: 50,
          formatter: function (str) {
            return '<a href="' + str + '">' + str + '</a>';
          }
        }
      }
    }, function (err, result){
      if (err) {
        return res.end(err.message);
      }
      $('.domains').html(result);
      if (req.session.user !== "anonymous") {
        $('.loginBar').remove();
      }
      
      $ = req.white($);
      callback(null, $.html());

      });
    });

};