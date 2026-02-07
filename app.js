require("dotenv").config();

if (process.env.ENABLE_TRACING === 'true') {
  require('./middleware/tracing');
}

const express = require("express");
const session = require("express-session");
const path = require("path");

const pinoHttp = require('pino-http');
const logger = require('./config/logger');
const { v4: uuidv4 } = require('uuid');

const { metricsMiddleware, metricsHandler } = require('./config/metrics');

const passport = require("passport");
require("./config/passport");

const { sequelize } = require("./models");

const authRoutes = require("./routes/auth");
const fileRoutes = require("./routes/file");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(metricsMiddleware);

app.use(pinoHttp({ 
  logger,
  genReqId: (req, res) => {
    return uuidv4();
  },
  autoLogging: {
    ignore: (req) => req.url === '/favicon.ico' || req.url === '/metrics'
  }, 
  customProps: (req, res) => {
    return {
      reqId: req.id 
    };
  },
  customReceivedMessage: function (req, res) {
    return `Request ${req.method} ${req.url} started`;
  },
  customSuccessMessage: (req, res) => {
    return `Request ${req.method} ${req.url} completed`;
  },
  customErrorMessage: (req, res, err) => {
    return `Request ${req.method} ${req.url} failed`;
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  }
}));

app.get('/metrics', metricsHandler);

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
  //console.error(err);
  logger.error({error: err}, `Uncaught error: ${err}`);
  res.json({
    message: req.app.get("env") === "development" ? err.message : errorcode,
    error: req.app.get("env") === "development" ? err : {},
  });
});

const startServer = async () => {
  try {
    await sequelize.authenticate();

    app.listen(PORT, () => {
      logger.info(`✓ Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error({error: error}, `✗ Failed to start server: ${error}`);
    process.exit(1);
  }
};

startServer();

process.on("SIGINT", () => {
  logger.info({port: PORT}, `\n✓ Shutting down gracefully...`);
  process.exit(0);
});

module.exports = app;
