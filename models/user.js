"use strict";
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      type: {
        type: DataTypes.ENUM('oauth', 'guest'),
        allowNull: false,
        validate: {
          isIn: {
            args: [['oauth', 'guest']],
            msg: 'Type must be either oauth or guest'
          }
        }
      },
      googleId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
        validate: {
          isRequiredForOAuth(value) {
            if (this.type === 'oauth' && !value) {
              throw new Error('googleId is required for OAuth users');
            }
          }
        }
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
          isEmail: true,
          isRequiredForOAuth(value) {
            if (this.type === 'oauth' && !value) {
              throw new Error('email is required for OAuth users');
            }
          }
        }
      },
      lastLogin: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "users",
      timestamps: true,
      validate: {
        guestOrOAuth() {
          if (this.type === 'oauth' && (!this.googleId || !this.email)) {
            throw new Error('OAuth users must have both googleId and email');
          }
          if (this.type === 'guest' && (this.googleId || this.email)) {
            throw new Error('Guest users cannot have googleId or email');
          }
        }
      }
    },
  );

  User.prototype.isGuestUser = function() {
    return this.type === 'guest';
  };

  User.prototype.isOAuthUser = function() {
    return this.type === 'oauth';
  };

  // Add static methods
  User.findGuests = function() {
    return this.findAll({ where: { type: 'guest' } });
  };

  User.findOAuthUsers = function() {
    return this.findAll({ where: { type: 'oauth' } });
  };

  User.associate = function (models) {
    User.hasMany(models.File, { foreignKey: "userId", as: "files", onDelete: 'CASCADE' });
  };

  User.associate = function (models) {
    User.hasOne(models.AccessCode, { foreignKey: "userId", as: "accessCode", onDelete: 'CASCADE' });
  };

  return User;
};
