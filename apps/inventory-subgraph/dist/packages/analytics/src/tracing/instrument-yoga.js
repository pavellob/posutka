import { trace } from '@opentelemetry/api';
export const yogaTracingPlugin = () => ({
    onExecute({ args }) {
        const span = trace.getTracer('yoga').startSpan('graphql.execute', {
            attributes: {
                'graphql.operation.name': args.operationName || 'anonymous',
                'graphql.operation.type': 'query', // Default to query since operationType might not be available
            },
        });
        return {
            onExecuteDone() {
                span.end();
            },
        };
    },
});
export const yogaContextPlugin = () => ({
    onExecute({ args }) {
        const span = trace.getActiveSpan();
        if (span) {
            span.setAttributes({
                'graphql.operation.name': args.operationName || 'anonymous',
                'graphql.operation.type': 'query', // Default to query
            });
        }
        return {};
    },
});
