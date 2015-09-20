module['exports'] = function serviceExecutionTimeoutMessage (seconds) {
  // TODO: use a template instead of str concat
  var str = '';
  str += 'Timeout Limit Hit. Request Aborted! \n\nHook source code took more than ';
  str += seconds;
  str += ' complete.\n\n';
  str += 'A delay of this long may indicate there is an error in the source code for the Hook. \n\n';
  str += 'If there are no errors and the Hook requires more than ';
  str += seconds;
  str += ' seconds to execute, you can upgrade to a paid account to increase your timeout limits.';
  return str;  
}