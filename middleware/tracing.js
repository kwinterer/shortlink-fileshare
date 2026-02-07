const { NodeSDK } = require('@opentelemetry/sdk-node');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const { 
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT
} = require('@opentelemetry/semantic-conventions');

const tracingEnabled = process.env.ENABLE_TRACING === 'true';

let sdk;

const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || 'shortlink_fileshare',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      [ATTR_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
    });

if (tracingEnabled) {
  sdk = new NodeSDK({
    resource: resource,
    traceExporter: new OTLPTraceExporter({
      url: process.env.TEMPO_ENDPOINT || 'http://tempo:4318/v1/traces'
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false
        }
      })
    ]
  });

  sdk.start();
  
  console.log('✓ OpenTelemetry tracing initialized');
  console.log(`  Service: ${process.env.SERVICE_NAME || 'express-app'}`);
  console.log(`  Endpoint: ${process.env.TEMPO_ENDPOINT || 'http://tempo:4318/v1/traces'}`);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.error('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
} else {
  console.log('ℹ OpenTelemetry tracing disabled');
  console.log('  Set ENABLE_TRACING=true to enable');
}

module.exports = sdk;