const pino = require("pino");
const { trace, context } = require("@opentelemetry/api");

const logger = pino({
  mixin() {
    const span = trace.getSpan(context.active());
    const traceId = span?.spanContext().traceId;
    return traceId ? { traceId } : {};
  },
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : {
          targets: [
            {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname",
              },
            },
            // Send directly to Loki
            {
              target: "pino-loki",
              options: {
                batching: true,
                interval: 5,
                host: "http://localhost:3100",
                labels: { app: "shortlink-fileshare-dev", env: "local" },
              },
            },
          ],
        },
});

module.exports = logger;