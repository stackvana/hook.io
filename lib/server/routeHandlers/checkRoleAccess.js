var keys = require('../../resources/keys');
var events = require('../../resources/events');
module['exports'] = function checkRollAccess (opts, next) {

  // bypass role-access for all non-http requests ( for use in migration scripts )
  if (typeof opts.req === "undefined") {
    console.log('warning: bypassing role access');
    return next(null, true);
  }

  var req = opts.req,
      res = opts.res,
      params = req.resource.params;

  var requestedRoles = opts.roles || [];
  var resource = require('resource');
  // console.log('using roll access'.blue, opts.req.url);
  // console.log('roles'.blue, opts.roles, opts.access);

  /*
  // remove this line?
  if (opts.roles === "keys::read") {
    return next(null, true);
  }
  */
  //console.log('slave', req.session.id, req.session.user);
  //console.log(req.headers)
  // TODO: clean up this block? looks like wrong logic checks
  /*
  if ((req.session.user && req.hook && req.hook.owner === req.session.user) || (req.hook && req.hook.isPrivate === false)) {
    resource.emit('keys::authAttempt', {
      ip: "127.0.0.3",
      hasAccess: true,
      url: req.url,
      owner: req.hook.owner
    });
    return next(null, true);
  }
  */

  var ev = opts.role.split('::');
  var evRoot = ev[0];
  // console.log('roleAccess', evRoot, req.session.user)

  /* TODO: check events
  if (evRoot === "events") {
    return next(null, true);
  }
  */

  // start out owner as anonymous, or unknown
  var owner = "anonymous";

  // if the user requesting the resource has a session, assume they are the owner of the resource
  if (req.session.user) {
    owner = req.session.user;
  }

  if (req.resource.owner) {
    owner = req.resource.owner
  }

  // if a hook has been bound to the request and it has an owner, assume that is the owner of the resource
  if (req.hook && req.hook.owner) {
    owner = req.hook.owner;
  }

  req.resource.owner = owner;

  // console.log('owner', owner, req.session.user)
  // parse out `public_key` and `private_key`
  if (typeof params.hook_private_key !== "undefined") {

    /*
    // can we remove this block?
    // TODO: add additional check for private check which gives admin access
    if (typeof req.params.hook_private_key === "undefined") {
      //return res.end('no access!');
    } 
    */
    var query = { /* owner: req.hook.owner, */ hook_private_key: params.hook_private_key };
    // console.log('QUERY for role'.yellow, query);
    keys.find(query, function (err, result) {
      if (err) {
        return res.end(err.message);
      }
      // console.log('ROLE ACCESS RESULT',result);
      var hasAccess = false;
      if(result.length > 0) {
        // todo: iterate through all roles in record and check if any match, if so pass, if not fail
        hasAccess = true;
        owner = result[0].owner;
        req.resource.owner = owner;
      } else {
        hasAccess = false;
      }
      resource.emit('keys::authAttempt', {
        ip: "127.0.0.3",
        hasAccess: hasAccess,
        owner: owner,
        /* name: req.hook.name, // TODO: fix not always have req.hook, like for datastore api */
        url: req.url
      });
      next(null, hasAccess);
      
    });

  } else if (owner === "anonymous") {
    // everyone has permission to do anything to anonymous resources
    return next(null, true);
  }
  else if (owner === req.session.user) {
    // users have full acces to their own resources ( when logged in with session )
    return next(null, true);
  }
  else {
    // TODO: better data
    resource.emit('keys::authAttempt', {
      ip: "127.0.0.3", // TODO: right ip
      hasAccess: false,
      owner: owner,
      //    name: req.hook.name,
      url: req.url
    });
    next(null, false);
  }

};
