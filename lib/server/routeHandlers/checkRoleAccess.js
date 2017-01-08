var keys = require('../../resources/keys');
var events = require('../../resources/events');
var cache = require('../../resources/cache');
module['exports'] = function checkRollAccess (opts, next) {

  // bypass role-access for all non-http requests ( for use in migration scripts )
  if (typeof opts.req === "undefined") {
    // TODO: why so many warnings? static assetts? can we bypass?
    //console.log('warning: bypassing role access');
    return next(null, true);
  }

  var req = opts.req,
      res = opts.res;

  opts.role = opts.role || "";
  var requestedRoles = opts.roles || [];
  var resource = require('resource');
  // console.log('using roll access'.blue, opts.req.url);
  // console.log('roles'.blue, opts.roles, opts.access);

  var ev = opts.role.split('::');
  var evRoot = ev[0];

  // start out owner as anonymous, or unknown
  var owner = "anonymous";

  // first, assume the owner is the current session user. it's most likely this isn't the case and will be overriden below
  if (req.session && req.session.user) {
    owner = req.session.user;
  }

  // if a resource paramter named 'owner' exists, assume that is the owner of the resource
  if (req.resource.params.owner && req.resource.params.owner.length > 0) {
    owner = req.resource.params.owner;
  }

  // if the :owner route has been defined, assume that's the owner instead
  if (req.params.owner && req.params.owner.length > 0) {
    owner = req.params.owner;
  }

  // if req.resource.owner has been explicityly set somewhere, assume that's the owner instead
  if (req.resource.owner) {
    // TODO: can we now remove this line?
    owner = req.resource.owner
  }

  // finally, if we are dealing with a hook which has been bound this request, assume that's the owner instead
  if (req.hook && req.hook.owner) {
    // TODO: can we now remove this line?
    owner = req.hook.owner;
  }

  // console.log(req.url, 'owner status', owner, 'session.owner', req.session.user, 'hasAccess', 'unknown')

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
    }
    // params override header values (since we may be passing in a key using a key)
    // may cause issues with header based key auth?
    if (typeof params.hook_private_key !== 'undefined') {
      privateKey = params.hook_private_key;
    }
    // console.log('owner status', owner, 'hasAccess', 'unknown')

    if (privateKey !== null && privateKey.length > 0) {
      // Remark: For now, we can key on req.params.owner ( the route parameter ) and everything should be keyed
      // Note: For some cases, req.params.owner may be undefined

      // check to see if key was found in cache, if not check couch and or add key to cache
      var keyPath = '/keys/' + req.params.owner + '/' + privateKey;
      var query = { owner: req.params.owner, hook_private_key: privateKey };

      // console.log('checking redis for key cache', keyPath)
      cache.get(keyPath, function (err, _key) {
        if (err) {
          return next(null, false);
        }
        if (_key === null) {
          // console.log('QUERY for role'.yellow, opts.role, query);
          keys.findOne(query, function(err, u){
            if (err) {
              return next(null, false);
            }
            // console.log('found u', u)
            if (typeof u === 'undefined') {
              return next(null, false);
            }
            cache.set(keyPath, u, function(){
              finish(err, u);
            });
          });
        } else {
          finish(null, _key);
        }
      });
      function finish (err, result) {
        // console.log('ROLE ACCESS RESULT',owner, result);
        var hasAccess = false;
        req.resource.keyName = result.name;
        if (owner !== result.owner /* && owner !== 'marak' */) {
          return next(null, false);
        }
        req.resource.owner = owner;
        if (typeof result.roles === "string") {
          result.roles = result.roles.split(',');
        }
        var roles = result.roles;
        if (roles.indexOf(opts.role) === -1) {
          hasAccess = false;
        } else {
          hasAccess = true;
        }
        if (opts.role === "") {
          hasAccess = true;
        }
        resource.emit('keys::authAttempt', {
          ip: req.connection.remoteAddress,
          hasAccess: hasAccess,
          owner: owner,
          url: req.url
        });
        next(null, hasAccess);
      }

    } else if (owner === "anonymous") {
      // no-one has permission to do anything to anonymous resources
      // Note: Is that right? it use to be opposite. Needs testing.
      return next(null, false);
    }
    else if (req.session && ((owner === req.session.user) || (req.session.user === "marak"))) {
      // console.log('owner status', owner, 'session.owner', req.session.user, 'hasAccess', 'unknown')
      // users have full access to their own resources ( when logged in with session ), so does "marak" admin account
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