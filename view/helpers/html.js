var html = {};
html.makeLink = function makeLink (url, text) {
  var str = '<a href="' + url + '">' + text + '</a>';
  return str;
};
html.rowToString = function rowToString (row) {
  var str = '<tr>';
  for (var col in row) {
    var val = row[col];
    if (!val) {
      val = '&nbsp;'
    }
    str += '<td>' + val + '</td>'
  }
  //str += '<tr><td>' + r.name + '</td><td>' + r.cronPattern + '</td><td></td><td></td><td></td></tr>';
  str += '</tr>';
  return str;
}
module.exports = html;