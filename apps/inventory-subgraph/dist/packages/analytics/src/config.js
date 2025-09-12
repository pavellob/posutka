export const loadConfig = () => ({
    serviceName: process.env.SVC_NAME || 'unknown',
    serviceVersion: process.env.SVC_VERSION,
    environment: process.env.NODE_ENV || 'dev',
    otlpEndpoint: process.env.OTLP_ENDPOINT,
    httpEndpoint: process.env.ANALYTICS_HTTP_ENDPOINT,
    enableConsole: process.env.ANALYTICS_CONSOLE !== 'false',
});
