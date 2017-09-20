var forms = require('resource-forms'),
mschemaForms = require('mschema-forms');

var mergeParams = require('./mergeParams');
var config = require('../config');
var bodyParser = require('body-parser');
var domain = require('../lib/resources/domain');
var checkRoleAccess = require('../lib/server/routeHandlers/checkRoleAccess');
var psr = require('parse-service-request');

module['exports'] = function view (opts, callback) {

   var req = opts.request,
       res = opts.response,
       $ = this.$;

   var appName = req.hostname;

   psr(req, res, function(req, res){
     var params = req.resource.params
     if (req.method === "POST") {
       checkRoleAccess({ req: req, res: res, role: "domain::create" }, function (err, hasPermission) {
         // console.log('check for role access', err, hasPermission, req.resource.owner)
         req.resource.params.owner = req.resource.owner;

         if (!hasPermission || req.resource.owner === "anonymous") { // don't allow anonymous hook update
           if (req.jsonResponse !== true && typeof params.hook_private_key === "undefined") {
             req.session.redirectTo = "/domains";
             return res.redirect('/login');
           }
           return res.end(config.messages.unauthorizedRoleAccess(req, "domain::create"));
         } else {
           if (req.jsonResponse) {
             // console.log('attempting to create domain'.yellow, req.resource.params);
             domain.create(req.resource.params, function (err, d) {
               if (err) {
                 return res.end(err.message);
               }
               res.json(d);
             })
           } else {
             renderForm();
           }
         }
       });

     } else {
       checkRoleAccess({ req: req, res: res, role: "domain::get" }, function (err, hasPermission) {
         // console.log('check for role access', err, hasPermission, req.resource.owner)
         req.resource.params.owner = req.resource.owner;

         if (!hasPermission || req.resource.owner === "anonymous") { // don't allow anonymous hook update
           if (req.jsonResponse !== true && typeof params.hook_private_key === "undefined") {
             req.session.redirectTo = "/domains";
             return res.redirect('/login');
           }
           return res.end(config.messages.unauthorizedRoleAccess(req, "domain::get"));
         } else {
           if (req.jsonResponse) {
             domain.find({ owner: req.resource.params.owner}, function (err, _domains){
               if (err) {
                 return res.end(err.message);
               }
               res.json(_domains);
             })
           } else {
             renderForm();
           }
         }
       });
     }
   });

   function renderForm () {

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
            placeholder: "/examples/echo",
            description: 'The Service to point your domain to. Example: /examples/echo',
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
    }


};