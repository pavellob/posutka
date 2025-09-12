export class HttpLogAdapter {
    endpoint;
    headers;
    constructor(endpoint, headers = {}) {
        this.endpoint = endpoint;
        this.headers = headers;
    }
    async write(rec) {
        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.headers,
                },
                body: JSON.stringify(rec),
            });
            if (!response.ok) {
                console.error(`Failed to send log to ${this.endpoint}: ${response.status}`);
            }
        }
        catch (error) {
            console.error(`Error sending log to ${this.endpoint}:`, error);
        }
    }
}
export class HttpEventAdapter {
    endpoint;
    headers;
    constructor(endpoint, headers = {}) {
        this.endpoint = endpoint;
        this.headers = headers;
    }
    async publish(ev) {
        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.headers,
                },
                body: JSON.stringify(ev),
            });
            if (!response.ok) {
                console.error(`Failed to send event to ${this.endpoint}: ${response.status}`);
            }
        }
        catch (error) {
            console.error(`Error sending event to ${this.endpoint}:`, error);
        }
    }
}
