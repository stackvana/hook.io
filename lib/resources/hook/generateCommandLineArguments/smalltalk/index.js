function smalltalkEscape (arg) {
  if (typeof arg === "undefined") {
    return "";
  }
  var str = arg.toString();
  str = str.split("\r\n");
  str = str.join(" ");
  str = arg.toString().replace(/'/g, '\'\'');
  return str;
}

module['exports'] = function generateSmalltalkArguments (service, env) {
  var args = [];
  var smalltalkInject = "";

  //schemeInject += '$Hook = "The Hook object isnt an object.";\n';
  //schemeInject += '$Hook_params = "The Hook.params object isnt an object.";\n';

  for (var p in env) {
    if (typeof env[p] === "object") {
      for (var s in env[p]) {
        var val = env[p][s];
        if (typeof val === "object") {
          // TODO: serialize value
          val = "unavailable";
        }
        //schemeInject += '$Hook_' + p + '_' + s + ' = \'' + env[p][s] + '\';\n'
        smalltalkInject += "Hook_" + p + "_" + s + " := \'" + smalltalkEscape(val) + "\'.\n";
      }
    } else {
      smalltalkInject += "Hook_" + p + " := \'" + smalltalkEscape(env[p]) + "\'.\n";
    }
  }

  args = [
    '-a', '',
    '-code', smalltalkInject  + service.evalSource,
    '-env', JSON.stringify(env),
    '-service', JSON.stringify(service)
  ];
  return args;
}