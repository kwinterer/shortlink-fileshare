require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const path = require("path");
const { sequelize } = require("./models");

const authRoutes = require("./routes/auth");
const fileRoutes = require("./routes/file");

const app = express();
const HOST = process.env.HOST || "127.0.0.1";
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  }),
);

require("./config/passport");
app.use(passport.initialize());
app.use(passport.session());

app.use("/file", fileRoutes);
app.use("/auth", authRoutes);

app.get("/login-failed", (req, res) => {
  res.status(401).json({
    error: "Authentication failed",
    message: "Unable to login with Google. Please try again.",
  });
});

app.use(function (req, res) {
  res.status(404).send("Page not found");
});

app.use(function (err, req, res, next) {
  let errorcode = err.status || 500;
  res.status(errorcode);
  console.error(err);
  res.json({
    message: req.app.get("env") === "development" ? err.message : errorcode,
    //error: req.app.get('env') === 'development' ? err : {}
    error: req.app.get("env") === "development" ? err : {},
  });
});

const startServer = async () => {
  try {
    await sequelize.authenticate();

    app.listen(PORT,HOST, () => {
      console.log("=".repeat(50));
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`✓ Access the application at: http://localhost:${PORT}`);
      console.log(`✓ Google OAuth login: http://localhost:${PORT}/auth/google`);
      console.log("=".repeat(50));
    });
  } catch (error) {
    console.error("✗ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

process.on("SIGINT", () => {
  console.log("\n✓ Shutting down gracefully...");
  process.exit(0);
});

module.exports = app;
