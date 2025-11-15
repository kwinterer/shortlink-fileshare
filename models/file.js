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
      },
      storedName: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      shortlink: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      filePath: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
