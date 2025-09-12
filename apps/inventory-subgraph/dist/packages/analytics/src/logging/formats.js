export class JsonFormatter {
    format(record) {
        return JSON.stringify(record);
    }
}
export class PrettyFormatter {
    format(record) {
        const { level, message, ts, service, correlation, data } = record;
        const timestamp = new Date(ts).toISOString();
        const corrStr = correlation ? ` [${Object.entries(correlation).map(([k, v]) => `${k}=${v}`).join(', ')}]` : '';
        const dataStr = data ? ` ${JSON.stringify(data)}` : '';
        return `${timestamp} [${level.toUpperCase()}] ${service}: ${message}${corrStr}${dataStr}`;
    }
}
export class StructuredFormatter {
    format(record) {
        const { level, message, ts, service, correlation, data } = record;
        const logObject = {
            timestamp: ts,
            level: level.toUpperCase(),
            service,
            message,
        };
        if (correlation) {
            logObject.correlation = correlation;
        }
        if (data) {
            logObject.data = data;
        }
        return JSON.stringify(logObject);
    }
}
