export class DataLayerNotImplementedError extends Error {
    constructor(method) {
        super(`DataLayer method ${method} is not implemented`);
        this.name = 'DataLayerNotImplementedError';
    }
}
