function tclEscape (arg) {
  if (typeof arg === "undefined") {
    return "";
  }
  var str = arg.toString();
  str = str.split("\r\n");
  str = str.join(";");
  return str;
}

module['exports'] = function generateBashArguments (service, env) {
  var args = [];
  var tclInject = "";

  // TODO: fix issues with escaping " and ' in property values

  for (var p in env) {
    if (typeof env[p] === "object") {
      for (var s in env[p]) {
        var val = env[p][s];
        if (typeof val === "object") {
          // TODO: serialize value
          val = "unavailable";
        }
        tclInject += "set Hook_" + p + "_" + s + " \"" + tclEscape(val) + "\"\n";
      }
    } else {
        tclInject += "set Hook_" + p + " \"" + tclEscape(env[p]) + "\"\n";
    }
  }
  args = [
    '-c', service.evalSource,
    '-s', JSON.stringify(service),
    '-p', tclInject
  ];
  return args;
}