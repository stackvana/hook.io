var keys = require('../../resources/keys');
var events = require('../../resources/events');
module['exports'] = function checkRollAccess (opts, next) {
  var req = opts.req,
      res = opts.res,
      params = req.resource.params;

  var resource = require('resource');
  console.log('using roll access'.blue, opts.req.url);

  // check existing session
  console.log('hook', req.hook)
  if(!req.hook) {
    req.hook = {
      isPrivate: false
    };
  }
  
  if(opts.access === "keys::read") {
    return next(null, true);
  }
  
  if (req.hook.isPrivate && req.hook.owner === req.session.user) {
    resource.emit('keys::authAttempt', {
      ip: "127.0.0.3",
      hasAccess: true,
      url: req.url
    });
    return next(null, true);
  }

  // todo: parse out basic auth

  // parse out `public_key` and `private_key`
  if (typeof params.hook_public_key !== "undefined") {

    // TODO: add additional check for private check which gives admin access
    if (typeof req.params.hook_private_key === "undefined") {
      //return res.end('no access!');
    } 

    //return res.end('no access!');
    var query = { owner: req.hook.owner, hook_public_key: params.hook_public_key };
    console.log('QUERY for role'.yellow, query);
    keys.find(query, function (err, result){
      if (err) {
        return res.end(err.message);
      }
      console.log('ROLE ACCESS RESULT',result)
      var hasAccess = false;
      if(result.length > 0) {
        hasAccess = true;
      } else {
        hasAccess = false;
      }
      resource.emit('keys::authAttempt', {
        ip: "127.0.0.3",
        hasAccess: hasAccess,
        owner: req.hook.owner,
        name: req.hook.name,
        url: req.url
      });
      next(null, hasAccess);
      
    });

  } else {
   if (req.hook.isPrivate) {
     next(null, false);
   } else {
     next(null, true);
   }
  }

};
