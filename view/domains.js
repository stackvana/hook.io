var forms = require('resource-forms'),
domain = require('../lib/resources/domain'),
mschemaForms = require('mschema-forms');

var mergeParams = require('./mergeParams');
var bodyParser = require('body-parser');


module['exports'] = function view (opts, callback) {

   var req = opts.request,
       res = opts.response,
       $ = this.$;

 // if not logged in, kick out
 if (!req.isAuthenticated()) {
   $('.domains').remove();
   req.session.redirectTo = "/domains";
   return callback(null, $.html());
   //return res.redirect('/login');
 } else {
   $('.loginBar').remove();
 }

 bodyParser()(req, res, function bodyParsed() {
   mergeParams(req, res, function (){});

   req.resource.params.owner = req.user.username;

   var middle = forms.generate({
      view: 'grid-with-form',
      resource: domain,
      action: '/domains',
      params: req.resource.params,
      query: { owner: req.user.username },
      useLayout: false,
      form: {
        create: {
          legend: 'Add a new Domain',
          submit: "Add Domain"
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
          description: 'The Hook to point your domain to. Example: /Marak/echo',
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
      callback(null, $.html());
      return;
      });
    });

};