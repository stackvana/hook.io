function luaEscape (arg) {
  if (typeof arg === "undefined") {
    return "";
  }
  var str = arg.toString();
  str = str.split("\r\n");
  str = str.join(" ");
  return str;
}

module['exports'] = function generateLuaArguments (service, env) {

  // TODO: replace naive _ style variable assignment with lua table
  // see: http://www.lua.org/pil/19.html
  var args = [];
  var luaInject = "";

  //luaInject += 'Hook = "The Hook object isnt a lua array."\n';
  //luaInject += 'Hook_params = "The Hook.params object isnt a lua array."\n';
  for (var p in env) {
    if (typeof env[p] === "object") {
      for (var s in env[p]) {
        luaInject += 'Hook_' + p + '_' + s + ' = \'' + luaEscape(env[p][s]) + '\'\n'
      }
    } else {
      luaInject += 'Hook_' + p + ' = \'' + luaEscape(env[p]) + '\'\n'
    }
  }
  //luaInject = 'Hook_params_source = "The Hook object isnt a lua array."\n';
  args = [
    '-code', service.evalSource,
    '-service', JSON.stringify(service),
    '-payload', luaInject
  ];

  return args;

}