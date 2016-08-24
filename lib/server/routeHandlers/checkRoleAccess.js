var keys = require('../../resources/keys');
var events = require('../../resources/events');
module['exports'] = function checkRollAccess (opts, next) {

  // bypass role-access for all non-http requests ( for use in migration scripts )
  if (typeof opts.req === "undefined") {
    // TODO: why so many warnings? static assetts? can we bypass?
    //console.log('warning: bypassing role access');
    return next(null, true);
  }

  var req = opts.req,
      res = opts.res;

  var requestedRoles = opts.roles || [];
  var resource = require('resource');
  // console.log('using roll access'.blue, opts.req.url);
  // console.log('roles'.blue, opts.roles, opts.access);

  var ev = opts.role.split('::');
  var evRoot = ev[0];

  // start out owner as anonymous, or unknown
  var owner = "anonymous";

  // if the user requesting the resource has a session, assume they are the owner of the resource
  if (req.session && req.session.user) {
    owner = req.session.user;
  }

  if (req.resource.owner) {
    owner = req.resource.owner
  }

  // if a hook has been bound to the request and it has an owner, assume that is the owner of the resource
  if (req.hook && req.hook.owner) {
    owner = req.hook.owner;
  }

  var mergeParams = require('merge-params');
  var bodyParser = require('body-parser');
  var jsonParser = bodyParser.json();

  /* removed as legacy aug 10, possible side-effects upchain, but should already be parsed...
  if (req.jsonResponse) {
    jsonParser(req, res, function(){
      mergeParams(req, res, _checkRoleAccess)
    })
  } else {
    _checkRoleAccess();
  }
  */
  _checkRoleAccess();

  function _checkRoleAccess () {

    var params = req.resource.params;
    req.resource.owner = owner;
    // console.log('owner', owner, req.session.user)
    // parse out `public_key` and `private_key`
    var privateKey = null;
    // check if the incoming request header has a private key
    if (req.headers && req.headers['hookio-private-key'] && req.headers['hookio-private-key'].length > 0) {
      privateKey = req.headers['hookio-private-key'];
    } else if (typeof params.hook_private_key !== 'undefined') {
      privateKey = params.hook_private_key;
    }
    if (privateKey !== null) {
      var query = { /* owner: req.hook.owner, */ hook_private_key: privateKey };
      // console.log('QUERY for role'.yellow, opts.role, query);
      keys.find(query, function (err, result) {
        if (err) {
          return res.end(err.message);
        }
        // console.log('ROLE ACCESS RESULT',result);
        var hasAccess = false;
        if(result.length > 0) {
          var roles = result[0].roles.split(',');
          if (roles.indexOf(opts.role) === -1) {
            hasAccess = false;
          } else {
            hasAccess = true;
            owner = result[0].owner;
            req.resource.owner = owner;
          }
        } else {
          hasAccess = false;
        }
        resource.emit('keys::authAttempt', {
          ip: req.connection.remoteAddress,
          hasAccess: hasAccess,
          owner: owner,
          url: req.url
        });
        next(null, hasAccess);
      });
    } else if (owner === "anonymous") {
      // no-one has permission to do anything to anonymous resources
      // Note: Is that right? it use to be opposite. Needs testing.
      return next(null, false);
    }
    else if (req.session && (owner === req.session.user)) {
      // users have full access to their own resources ( when logged in with session )
      return next(null, true);
    }
    else {
      resource.emit('keys::authAttempt', {
        ip: req.connection.remoteAddress,
        hasAccess: false,
        owner: owner,
        url: req.url
      });
      next(null, false);
    }
  };
};