module.exports = function (opts, cb) {
  var res = opts.res, req = opts.req;
  var o = {
    user: req.user,
    session: req.session
  }
  //res.json(o);
  res.json(req.session);
}