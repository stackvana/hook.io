function bashEscape (arg) {
  if (typeof arg === "undefined") {
    return "";
  }
  var str = arg.toString();
  str = arg.toString().replace(/"/g, '\'');
  str = str.split("\r\n");
  str = str.join(" ");
  return str;
}

module['exports'] = function generateBashArguments (service, env) {
  // parsing JSON in bash is not so great
  // instead, just iterate through all our properties,
  // and generate a bunch of unique keys
  var args = [];
  var bashInject = "";
  bashInject += 'Hook="The Hook object isnt a bash object.";\n'
  bashInject += 'Hook_params="The Hook.params object isnt a bash object.";\n'
  for (var p in env) {
    if (typeof env[p] === "object") {
      for (var s in env[p]) {
        bashInject += 'Hook_' + p + '_' + s + '="' + bashEscape(env[p][s]) + '";\n'
      }
    } else {
      bashInject += 'Hook_' + p + '="' + bashEscape(env[p]) + '";\n'
    }
  }
  args = [
    '-code', service.evalSource,
    '-service', JSON.stringify(service),
    '-payload', bashInject
  ];
  return args;
}