module['exports'] = function parseJSON (res) {
  var json, e;
  try {
     res = JSON.parse(res);
   } catch (err) {
     e = err;
     e.message = 'Cannot parse as JSON string: ' + res;
     res = res;
   }
   if (e) {
     //throw e;
   }
   return res;
};