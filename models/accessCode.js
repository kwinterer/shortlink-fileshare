"use strict";
module.exports = (sequelize, DataTypes) => {
  const AccessCode = sequelize.define(
    "AccessCode",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
    },
    {
      tableName: "accessCodes",
      timestamps: true,
    },
  );

  AccessCode.associate = function (models) {
    AccessCode.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  };

  return AccessCode;
};
