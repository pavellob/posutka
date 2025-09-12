import { PrettyFormatter } from '../logging/formats';
export class ConsoleLogAdapter {
    formatter;
    constructor(formatter = new PrettyFormatter()) {
        this.formatter = formatter;
    }
    write(rec) {
        console.log(this.formatter.format(rec));
    }
}
export class ConsoleEventAdapter {
    async publish(ev) {
        console.log(`[EVENT] ${ev.event} at ${ev.ts}`, {
            orgId: ev.orgId,
            userId: ev.userId,
            traceId: ev.traceId,
            data: ev.data,
            version: ev.version,
        });
    }
}
