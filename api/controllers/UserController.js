/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var Emailaddresses = require('machinepack-emailaddresses');
var Passwords = require('machinepack-passwords');
var Gravatar = require('machinepack-gravatar');

module.exports = {

  signup: function(req, res) {

    if (_.isUndefined(req.param('email'))) {
      return res.badRequest('An email address is required!');
    }

    if (_.isUndefined(req.param('password'))) {
      return res.badRequest('A password is required!');
    }

    if (req.param('password').length < 6) {
      return res.badRequest('Password must be at least 6 characters!');
    }

    if (_.isUndefined(req.param('username'))) {
      return res.badRequest('A username is required!');
    }

    var splitUsername = req.param('username').split(' ').join('-');

    Emailaddresses.validate({
      string: req.param('email'), //#B
    }).exec({
      // An unexpected error occurred.
      error: function(err) {
        return res.serverError(err); //#C
      },
      // The provided string is not an email address.
      invalid: function() {
        return res.badRequest('Doesn\'t look like an email address to me!'); //#D
      },
      // OK.
      success: function() { //#B
        Passwords.encryptPassword({
          password: req.param('password'), //#A
        }).exec({

          error: function(err) {
            return res.serverError(err); //#B
          },

          success: function(result) {

            var options = {};

            try {

              options.gravatarURL = Gravatar.getImageUrl({
                emailAddress: req.param('email') //#A
              }).execSync();

            } catch (err) {
              return res.serverError(err); //#B
            }

            options.email = req.param('email');
            options.username = splitUsername;
            options.encryptedPassword = result;
            options.deleted = false;
            options.admin = false;
            options.banned = false;

            User.create(options).exec(function(err, createdUser) {
              if (err) {
                console.log('the error is: ', err.invalidAttributes);

                if (err.invalidAttributes && err.invalidAttributes.email && err.invalidAttributes.email[0] && err.invalidAttributes.email[0].rule === 'unique') {

                  // return res.send(409, 'Email address is already taken by another user, please try again.');
                  return res.alreadyInUse(err);
                }

                if (err.invalidAttributes && err.invalidAttributes.username && err.invalidAttributes.username[0] && err.invalidAttributes.username[0].rule === 'unique') {

                  // return res.send(409, 'Username is already taken by another user, please try again.');
                  return res.alreadyInUse(err);
                }

                return res.negotiate(err);
              }

              return res.json(createdUser);
            });
          }
        });
      }
    });
  },

  profile: function(req, res) {

    // Try to look up user using the provided email address
    User.findOne(req.param('id')).exec(function foundUser(err, user) {
      // Handle error
      if (err) return res.negotiate(err); //#C

      // Handle no user being found
      if (!user) return res.notFound(); //#D

      // Return the user
      return res.json(user); //#E
    });
  },

  delete: function(req, res) {

    if (!req.param('id')) { //#A
      return res.badRequest('id is a required parameter.');
    }

    User.destroy({ //#B
      id: req.param('id')
    }).exec(function(err, usersDestroyed) {
      if (err) return res.negotiate(err); //#C
      if (usersDestroyed.length === 0) { //#D
        return res.notFound();
      }
      return res.ok(); //#E
    });
  },
  removeProfile: function(req, res) {

    if (!req.param('id')) { //#A
      return res.badRequest('id is a required parameter.');
    }

    User.update({ //#B
      id: req.param('id')
    }, {
      deleted: true //#C
    }, function(err, removedUser) {

      if (err) return res.negotiate(err); //#D
      if (removedUser.length === 0) {
        return res.notFound();
      }

      return res.ok(); //#E
    });
  },
  restoreProfile: function(req, res) {

    User.findOne({ //#A
      email: req.param('email')
    }, function foundUser(err, user) {
      if (err) return res.negotiate(err); //#B
      if (!user) return res.notFound();

      Passwords.checkPassword({ //#C
        passwordAttempt: req.param('password'),
        encryptedPassword: user.encryptedPassword
      }).exec({

        error: function(err) { //#D
          return res.negotiate(err);
        },

        incorrect: function() { //#E
          return res.notFound();
        },

        success: function() {

          User.update({ //#F
            id: user.id
          }, {
            deleted: false
          }).exec(function(err, updatedUser) {

            return res.json(updatedUser); //#G
          });
        }
      });
    });
  },

  restoreGravatarURL: function(req, res) {

    try {

      var restoredGravatarURL = gravatarURL = Gravatar.getImageUrl({
        emailAddress: req.param('email')
      }).execSync();

      return res.json(restoredGravatarURL);

    } catch (err) {
      return res.serverError(err);
    }
  },

  updateProfile: function(req, res) {

    User.update({
      id: req.param('id')
    }, {
      gravatarURL: req.param('gravatarURL') //#B
    }, function(err, updatedUser) {

      if (err) return res.negotiate(err); //#C

      return res.json(updatedUser); //#D

    });
  },

  changePassword: function(req, res) {

    if (_.isUndefined(req.param('password'))) { //#A
      return res.badRequest('A password is required!');
    }

    if (req.param('password').length < 6) { //#A
      return res.badRequest('Password must be at least 6 characters!');
    }

    Passwords.encryptPassword({ //#B
      password: req.param('password'),
    }).exec({
      error: function(err) {
        return res.serverError(err); //#C
      },
      success: function(result) {

        User.update({ //#D
          id: req.param('id')
        }, {
          encryptedPassword: result
        }).exec(function(err, updatedUser) {
          if (err) {
            return res.negotiate(err);
          }
          return res.json(updatedUser); //#E
        });
      }
    });
  },

  adminUsers: function(req, res) {

    User.find().exec(function(err, users){    //#A

      if (err) return res.negotiate(err);   //#B

      return res.json(users);     //#C

    });
  },

  updateAdmin: function(req, res) {

    User.update(req.param('id'), {    //#A
      admin: req.param('admin')   //#B
    }).exec(function(err, update){

     if (err) return res.negotiate(err);  //#C

      res.ok();       //#D
    });
  },

  updateBanned: function(req, res) {
    User.update(req.param('id'), {
      banned: req.param('banned')
    }).exec(function(err, update){
     if (err) return res.negotiate(err);
      res.ok();
    });
  },

  updateDeleted: function(req, res) {
    User.update(req.param('id'), {
      deleted: req.param('deleted')
    }).exec(function(err, update){
     if (err) return res.negotiate(err);
      res.ok();
    });
  }
};