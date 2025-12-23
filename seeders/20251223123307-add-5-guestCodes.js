//////////////////////////////////////////////////////////////
// This is to be used manually.
// Needs to be replaced with admin role + admin rest endpoints
//////////////////////////////////////////////////////////////
"use strict";

/** @type {import('sequelize-cli').Migration} */

const { v4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    const ids = Array.from({ length: 5 }, () => v4());

    const codes = ids.map((id) => ({
      id,
      type: "GuestCode",
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    return queryInterface.bulkInsert("accessCodes", codes);
  },

  async down(queryInterface, Sequelize) {
    const newestCodes = await queryInterface.sequelize.query(
      `
      SELECT id 
      FROM "accessCodes"
      WHERE type = 'GuestCode'
      ORDER BY "createdAt" DESC
      LIMIT 5
      `,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const ids = newestCodes.map((r) => r.id);

    return queryInterface.bulkDelete("accessCodes", {
      id: ids,
    });
  },
};
