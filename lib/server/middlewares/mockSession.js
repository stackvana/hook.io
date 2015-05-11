/*

  This module is responsible for inserting a mock user sesssion into Passport
  This mock session will bypass any outgoing calls to Github, 
  allowing the project to work in Offline mode

*/

module['exports'] = function mockSessions (req, res, next) {
  console.log('using mock session middleware', next);
  req.isAuthenticated = function() {
   return true;
  };
  req.user = {
    username: "Marak"
  };
  next();
};
