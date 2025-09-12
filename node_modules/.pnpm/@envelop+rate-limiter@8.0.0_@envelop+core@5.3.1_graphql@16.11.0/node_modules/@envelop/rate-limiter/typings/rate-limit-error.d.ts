declare class RateLimitError extends Error {
    readonly isRateLimitError = true;
    constructor(message: string);
}
export { RateLimitError };
