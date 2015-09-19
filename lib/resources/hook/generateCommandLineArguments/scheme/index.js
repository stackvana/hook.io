module['exports'] = function generateSchemeArguments (service, env) {
  var args = [];
  var schemeInject = "";

  //schemeInject += '$Hook = "The Hook object isnt an object.";\n';
  //schemeInject += '$Hook_params = "The Hook.params object isnt an object.";\n';

  for (var p in env) {
    if (typeof env[p] === "object") {
      for (var s in env[p]) {
        schemeInject += "(define Hook_" + p + "_" + s + " '" + env[p][s] + ")\n";
      }
    } else {
      schemeInject += "(define Hook_" + p + " '" + env[p] + ")\n";
    }
  }
  args = [
    '-c', schemeInject + '\n' + service.evalSource
  ];

  return args;
}
