export class LoggingEventAdapter {
    log;
    constructor(log) {
        this.log = log;
    }
    async publish(ev) {
        this.log.write({
            level: 'info',
            message: `event:${ev.event}`,
            ts: ev.ts,
            service: 'event-bus',
            data: ev
        });
    }
}
export class DomainEvents {
    adapters;
    constructor(adapters) {
        this.adapters = adapters;
    }
    async emit(ev) {
        const full = {
            ...ev,
            ts: new Date().toISOString(),
            version: ev.version ?? 1
        };
        await Promise.all(this.adapters.map(a => a.publish(full)));
    }
}
export class EventBus {
    static instance;
    static getInstance(adapters = []) {
        if (!this.instance) {
            this.instance = new DomainEvents(adapters);
        }
        return this.instance;
    }
    static reset() {
        this.instance = undefined;
    }
}
