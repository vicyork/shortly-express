var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users'
  //password: password
});

module.exports = User;


///////////////////////////////////
// test
///////////////////////////////////

// user = new User({username: "Svnh", password: "Svnh"});

// console.log(db.knex("users"));
