module.exports = {
  sqlite: {
    dialect: "sqlite",
    storage: process.env.DATABASE_SQLITE_PATH || "./data/database.sqlite",
  },
  postgres: {
    username: process.env.DATABASE_POSTGRES_USER,
    password: process.env.DATABASE_POSTGRES_PASSWORD,
    database: process.env.DATABASE_POSTGRES_NAME || "shortlink_fileshare",
    host: process.env.DATABASE_POSTGRES_HOST || "postgres-service",
    port: 5432,
    dialect: "postgres",
  },
};
