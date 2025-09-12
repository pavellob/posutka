export class OTLPLogAdapter {
    endpoint;
    constructor(endpoint) {
        this.endpoint = endpoint;
    }
    async write(rec) {
        // In a real implementation, you would send logs to OTLP endpoint
        // For now, we'll just log to console with OTLP format
        console.log(`[OTLP-LOG] ${JSON.stringify(rec)}`);
    }
}
export class OTLPEventAdapter {
    endpoint;
    constructor(endpoint) {
        this.endpoint = endpoint;
    }
    async publish(ev) {
        // In a real implementation, you would send events to OTLP endpoint
        // For now, we'll just log to console with OTLP format
        console.log(`[OTLP-EVENT] ${JSON.stringify(ev)}`);
    }
}
