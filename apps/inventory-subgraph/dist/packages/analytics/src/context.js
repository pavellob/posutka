export const withCorrelation = (base, corr) => ({
    ...base,
    correlation: corr,
});
export const extractCorrelationFromHeaders = (headers) => ({
    traceId: headers.get('x-trace-id') || undefined,
    spanId: headers.get('x-span-id') || undefined,
    orgId: headers.get('x-org-id') || undefined,
    userId: headers.get('x-user-id') || undefined,
    requestId: headers.get('x-request-id') || undefined,
});
