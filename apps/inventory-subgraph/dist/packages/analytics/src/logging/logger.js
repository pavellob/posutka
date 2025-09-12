export class ConsoleAdapter {
    write(rec) {
        console.log(JSON.stringify(rec));
    }
}
export class Logger {
    service;
    env;
    adapters;
    constructor(service, env, adapters = [new ConsoleAdapter()]) {
        this.service = service;
        this.env = env;
        this.adapters = adapters;
    }
    log(level, message, data, correlation) {
        const rec = {
            level,
            message,
            ts: new Date().toISOString(),
            service: this.service,
            env: this.env,
            correlation,
            data
        };
        this.adapters.forEach(a => a.write(rec));
    }
    info(msg, data, corr) {
        this.log('info', msg, data, corr);
    }
    warn(msg, data, corr) {
        this.log('warn', msg, data, corr);
    }
    error(msg, data, corr) {
        this.log('error', msg, data, corr);
    }
    debug(msg, data, corr) {
        this.log('debug', msg, data, corr);
    }
}
