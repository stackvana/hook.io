var config;
process.nextTick(function(){
  config = require('../');
});

module['exports'] = function unauthorizedRoleAccess (req, role) {
  // TODO: use a template instead of str concat
  var str = '',
  errorType = "unauthorized-role-access";

  // if no session, create temporary session scope for anonymous user error
  if (typeof req.session === 'undefined') {
    req.session = {};
  }

  if (typeof req.session.user === "undefined") {
    req.session.user = "anonymous";
  }

  if (typeof req.resource.params.hook_private_key !== "undefined") {
    // if key was provided but the role check failed ( since it reached here ) show specific error message
    str += "A role access check was attempted but failed with key " + '"' + req.resource.params.hook_private_key + '"\n\n';
    errorType = "unauthorized-role-access";
    //str += "Try again with a diffirent `hook_private_key` value?\n\n";
  }

  if (typeof req.resource.keyName !== "undefined") {
    str += ('"' + req.resource.keyName  + '" does not have the role "' + role + '" which is required to access "' + req._parsedUrl.pathname + '"');
  } else {
    str += ('"' + req.session.user  + '" does not have the role "' + role + '" which is required to access "' + req._parsedUrl.pathname + '"');
  }

  if (req.session.user === "anonymous") {
    str += "\n\nIf you are the owner of this resource try logging in at https://" + config.app.domain + "/login";
  }

  if (typeof req.resource.params.hook_private_key !== "undefined") {
    // do nothing
  } else {
    // provide instructions to provide keys
    str += "\n\nIf any access keys have been created you can also provide a `hook_private_key` parameter to access the service.";
  }

  if (req.jsonResponse === true) {
    str = JSON.stringify({
      error: true,
      message: str,
      user: req.session.user,
      role: role,
      type: errorType
    });
  }

  return str;
}