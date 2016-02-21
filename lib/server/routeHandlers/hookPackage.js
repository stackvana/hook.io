var hook = require('../../resources/hook');
var resource = require('resource');
var checkRoleAccess = require('./checkRoleAccess');
var config = require('../../../config');

module['exports'] = function handleHookPackage (req, res) {

   /*

   // TODO: make configurable for private hooks
   if (!req.isAuthenticated()) {
     req.session.redirectTo = req.url;
     return res.redirect('/login');
   }

   if (req.session.user !== req.params.owner && req.session.user !== "marak") {
     return res.end(req.session.user + ' does not have permission to view ' + req.params.owner + "/" + req.params.hook);
   }
   */

   // fetch the latest version of hook ( non-cached )
   hook.find({ owner: req.params.owner, name: req.params.hook }, function (err, result) {
     if (err) {
       return res.end(err.message);
     }
     if (result.length === 0) {
       return server.handle404(req, res);
     }
     var h = result[0];

     checkRoleAccess({ req: req, res: res, role: "hook::package::read" }, function (err, hasPermission) {

       // only protect logs of private services
       if (h.isPrivate !== true) {
         hasPermission = true;
       }

       if (!hasPermission) {
         return res.end(config.messages.unauthorizedRoleAccess(req, "hook::package::read"));
       }

       // TODO: better package.json support
       var pkg = {
         "name": h.name,
         "version": "1.0.0",
         "description": "",
         "main": "index.js",
         "scripts": {
           "test": "echo \"Error: no test specified\" && exit 1"
         },
         "author": h.owner,
         "license": "MIT"
       };

       resource.emit('hook::package::read', {
         ip: req.connection.remoteAddress,
         owner: req.params.owner,
         url: req.url
       });

       res.end(JSON.stringify(pkg, true, 2));
     });
   });

}
