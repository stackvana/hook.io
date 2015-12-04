module['exports'] = function unauthorizedRoleAccess (req) {
  // TODO: use a template instead of str concat
  var str;
  
  if (typeof req.session.user === "undefined") {
    req.session.user = "anonymous";
  }
  
  str = (req.session.user + ' does not have permission to view ' + req.params.owner + "/" + req.params.hook);
  return str;  
}