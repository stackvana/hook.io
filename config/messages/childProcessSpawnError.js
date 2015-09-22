module['exports'] = function childProcessSpawnErrorMessage (args) {
  // TODO: use a template instead of str concat
  var str = '';
  str += 'Error in spawning child process. Error code: 1\n';
  str += 'We attempted to run the following command: \n\n'
  str += args.join(" ");
  return str;  
}