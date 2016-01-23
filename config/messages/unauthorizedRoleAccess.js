module['exports'] = function unauthorizedRoleAccess (req, role) {
  // TODO: use a template instead of str concat
  var str;

  if (typeof req.session.user === "undefined") {
    req.session.user = "anonymous";
  }

  str = ('"' + req.session.user + '" does not have permission to "' + role + '" -> "' + req.url + '"');

  if (req.session.user === "anonymous") {
    str += "\n\nIf you are the owner of this service try logging in at https://hook.io"
  }

  if (typeof req.resource.params.hook_private_key !== "undefined") {
    // if key was provided but the role check failed ( since it reached here ) show specific error message
    str += "\n\nA role access check was attempted but failed with key: " + '"' + req.resource.params.hook_private_key + '"';
  } else {
    // provide instructions to provide keys
    str += "\n\nIf any access keys have been created you can also provide a `hook_private_key` parameter to access the service.";
  }
  
  return str;  
}