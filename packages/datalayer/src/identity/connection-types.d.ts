import type { User, Organization } from './types.js';
export interface Edge<T> {
    node: T;
    cursor: string;
}
export interface PageInfo {
    hasNextPage: boolean;
    endCursor?: string;
}
export interface Connection<T> {
    edges: Edge<T>[];
    pageInfo: PageInfo;
}
export interface UserConnection extends Connection<User> {
}
export interface OrganizationConnection extends Connection<Organization> {
}
