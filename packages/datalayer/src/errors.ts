export class DataLayerNotImplementedError extends Error {
  constructor(method: string) {
    super(`DataLayer method ${method} is not implemented`);
    this.name = 'DataLayerNotImplementedError';
  }
}
