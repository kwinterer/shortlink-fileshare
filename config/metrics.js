const promClient = require('prom-client');
const { trace, context } = require('@opentelemetry/api');

promClient.register.setContentType(
  promClient.Registry.OPENMETRICS_CONTENT_TYPE,
);

promClient.collectDefaultMetrics({
  prefix: 'shortlink_fileshare_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status', 'country'],
  enableExemplars: true,
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status', 'country'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  enableExemplars: true,
});

const httpRequestsByIP = new promClient.Counter({
  name: 'http_requests_by_ip',
  help: 'Total HTTP requests by IP address',
  labelNames: ['ip', 'method', 'route', 'status', 'country'],
  enableExemplars: true,
});

const httpRequestsInFlight = new promClient.Gauge({
  name: 'http_requests_in_flight',
  help: 'Number of HTTP requests currently being processed',
});
function metricsMiddleware(req, res, next) {
  const start = Date.now();

  httpRequestsInFlight.inc();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const method = req.method;
    const status = res.statusCode;
    const ip = req.headers['cf-connecting-ip'] || 
               req.headers['x-forwarded-for']?.split(',')[0] || 
               req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress;
    const country = req.headers['cf-ipcountry'] || 'unknown';
    
    const span = trace.getSpan(context.active());
    const traceId = span?.spanContext().traceId;

    httpRequestsTotal.inc({
      labels: { method, route, status, country}, 
      value: 1, 
      exemplarLabels: traceId ? { traceID: traceId } : undefined
    });
    
    httpRequestDuration.observe({
      labels: { method, route, status, country},
      value: duration, 
      exemplarLabels: traceId ? { traceID: traceId } : undefined
    });

    httpRequestsByIP.inc({
      labels: { ip, method, route, status, country}, 
      value: 1, 
      exemplarLabels: traceId ? { traceID: traceId } : undefined
    });
    
    httpRequestsInFlight.dec();
  });
  
  next();
}

async function metricsHandler(req, res) {
  res.set('Content-Type', promClient.register.contentType);
  const metrics = await promClient.register.metrics();
  res.end(metrics);
}

module.exports = {
  metricsMiddleware,
  metricsHandler,
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestsByIP,
  httpRequestsInFlight
};