import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes as SRA } from '@opentelemetry/semantic-conventions';
import { loadConfig } from '../config';
let meterProvider;
export function initMetrics() {
    if (meterProvider) {
        return meterProvider.getMeter('analytics');
    }
    const cfg = loadConfig();
    meterProvider = new MeterProvider({
        resource: new Resource({
            [SRA.SERVICE_NAME]: cfg.serviceName,
            [SRA.DEPLOYMENT_ENVIRONMENT]: cfg.environment,
            [SRA.SERVICE_VERSION]: cfg.serviceVersion,
        }),
    });
    if (cfg.otlpEndpoint) {
        meterProvider.addMetricReader(new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter({ url: cfg.otlpEndpoint }),
            exportIntervalMillis: 10000, // 10 seconds
        }));
    }
    return meterProvider.getMeter(cfg.serviceName);
}
export async function shutdownMetrics() {
    if (meterProvider) {
        await meterProvider.shutdown();
        meterProvider = undefined;
    }
}
