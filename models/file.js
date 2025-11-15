"use strict";
module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define(
    "File",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      originalName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Original filename uploaded by user",
      },
      storedName: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: "Filename as stored on disk",
      },
      shortlink: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: "Short alphanumeric code for accessing the file",
      },
      filePath: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Full path to the file on disk",
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "MIME type of the file",
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "File size in bytes",
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
    },
    {
      tableName: "files",
      timestamps: true,
    },
  );

  File.associate = function (models) {
    File.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  };

  return File;
};
