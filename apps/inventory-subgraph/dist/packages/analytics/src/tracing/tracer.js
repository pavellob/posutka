import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes as SRA } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { loadConfig } from '../config';
let sdk;
export function initTracing(cfg = loadConfig()) {
    if (sdk)
        return sdk;
    const exporters = cfg.otlpEndpoint
        ? [new OTLPTraceExporter({ url: cfg.otlpEndpoint })]
        : [];
    sdk = new NodeSDK({
        traceExporter: exporters[0],
        resource: new Resource({
            [SRA.SERVICE_NAME]: cfg.serviceName,
            [SRA.DEPLOYMENT_ENVIRONMENT]: cfg.environment,
            [SRA.SERVICE_VERSION]: cfg.serviceVersion,
        }),
    });
    sdk.start();
    return sdk;
}
export async function shutdownTracing() {
    await sdk?.shutdown();
}
