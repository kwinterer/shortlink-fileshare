"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('files', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      originalName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      storedName: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      shortlink: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      filePath: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      mimeType: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("files");
  },
};
