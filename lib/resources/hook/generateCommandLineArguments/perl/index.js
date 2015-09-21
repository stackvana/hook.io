function perlEscape (arg) {
  if (typeof arg === "undefined") {
    return "";
  }
  var str = arg.toString();
  str = str.split("\r\n");
  str = str.join(" ");
  return str;
}

module['exports'] = function generatePerlArguments (service, env) {

  var args = [];
  var perlInject = "";

  perlInject += '$Hook = "The Hook object isnt an object.";\n';
  perlInject += '$Hook_params = "The Hook.params object isnt an object.";\n';

  for (var p in env) {
    if (typeof env[p] === "object") {
      for (var s in env[p]) {
        perlInject += '$Hook_' + p + '_' + s + ' = \'' + perlEscape(env[p][s]) + '\';\n'
      }
    } else {
      perlInject += '$Hook_' + p + ' = \'' + perlEscape(env[p]) + '\';\n'
    }
  }
  args = [
    '-code', service.evalSource,
    '-service', JSON.stringify(service),
    '-payload', perlInject
  ];
  return args;

}