// @ts-nocheck
import { GraphQLResolveInfo, SelectionSetNode, FieldNode, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { createMeshHTTPHandler, MeshHTTPHandler } from '@graphql-mesh/http';
import { getMesh, type ExecuteMeshFn, type SubscribeMeshFn, type MeshContext as BaseMeshContext, type MeshInstance } from '@graphql-mesh/runtime';
import { MeshStore, FsStoreStorageAdapter } from '@graphql-mesh/store';
import { path as pathModule } from '@graphql-mesh/cross-helpers';
import type { ImportFn } from '@graphql-mesh/types';
import type { SupergraphTypes } from './sources/Supergraph/types';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };



/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  UUID: { input: any; output: any; }
  DateTime: { input: any; output: any; }
  Money: { input: any; output: any; }
  JSON: { input: any; output: any; }
};

export type Query = {
  property?: Maybe<Property>;
  unit?: Maybe<Unit>;
  booking?: Maybe<Booking>;
  bookings: BookingConnection;
};


export type QuerypropertyArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryunitArgs = {
  id: Scalars['UUID']['input'];
};


export type QuerybookingArgs = {
  id: Scalars['UUID']['input'];
};


export type QuerybookingsArgs = {
  orgId?: InputMaybe<Scalars['UUID']['input']>;
  unitId?: InputMaybe<Scalars['UUID']['input']>;
  from?: InputMaybe<Scalars['DateTime']['input']>;
  to?: InputMaybe<Scalars['DateTime']['input']>;
  status?: InputMaybe<BookingStatus>;
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
};

export type Mutation = {
  createProperty: Property;
  createUnit: Unit;
  blockDates: Array<CalendarDay>;
  createBooking: Booking;
  cancelBooking: Booking;
  changeBookingDates: Booking;
  generateContract: Document;
  depositAction: DepositTransaction;
  aiCommand: AICommandResult;
};


export type MutationcreatePropertyArgs = {
  orgId: Scalars['UUID']['input'];
  title: Scalars['String']['input'];
  address: Scalars['String']['input'];
  amenities?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationcreateUnitArgs = {
  propertyId: Scalars['UUID']['input'];
  name: Scalars['String']['input'];
  capacity: Scalars['Int']['input'];
  beds: Scalars['Int']['input'];
  bathrooms: Scalars['Int']['input'];
  amenities?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationblockDatesArgs = {
  unitId: Scalars['UUID']['input'];
  from: Scalars['DateTime']['input'];
  to: Scalars['DateTime']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
};


export type MutationcreateBookingArgs = {
  input: CreateBookingInput;
};


export type MutationcancelBookingArgs = {
  id: Scalars['UUID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationchangeBookingDatesArgs = {
  id: Scalars['UUID']['input'];
  checkIn: Scalars['DateTime']['input'];
  checkOut: Scalars['DateTime']['input'];
};


export type MutationgenerateContractArgs = {
  bookingId: Scalars['UUID']['input'];
  template?: InputMaybe<Scalars['String']['input']>;
};


export type MutationdepositActionArgs = {
  bookingId: Scalars['UUID']['input'];
  action: Scalars['String']['input'];
  amount?: InputMaybe<MoneyInput>;
};


export type MutationaiCommandArgs = {
  orgId: Scalars['UUID']['input'];
  command: Scalars['String']['input'];
  context?: InputMaybe<Scalars['JSON']['input']>;
};

export type Organization = {
  id: Scalars['UUID']['output'];
};

export type Property = {
  id: Scalars['UUID']['output'];
  org: Organization;
  title: Scalars['String']['output'];
  address: Scalars['String']['output'];
  amenities: Array<Scalars['String']['output']>;
};

export type Unit = {
  id: Scalars['UUID']['output'];
  property: Property;
  name: Scalars['String']['output'];
  capacity: Scalars['Int']['output'];
  beds: Scalars['Int']['output'];
  bathrooms: Scalars['Int']['output'];
  amenities: Array<Scalars['String']['output']>;
  calendar: Array<CalendarDay>;
};


export type UnitcalendarArgs = {
  rangeStart: Scalars['DateTime']['input'];
  rangeEnd: Scalars['DateTime']['input'];
};

export type Booking = {
  id: Scalars['UUID']['output'];
  org: Organization;
  unit: Unit;
  guest: Guest;
  status: BookingStatus;
  source: BookingSource;
  checkIn: Scalars['DateTime']['output'];
  checkOut: Scalars['DateTime']['output'];
  guestsCount: Scalars['Int']['output'];
  priceBreakdown: PriceBreakdown;
  notes?: Maybe<Scalars['String']['output']>;
  cancellationReason?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type Guest = {
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
  email: Scalars['String']['output'];
  phone?: Maybe<Scalars['String']['output']>;
  documentType?: Maybe<Scalars['String']['output']>;
  documentNumber?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type Document = {
  id: Scalars['UUID']['output'];
  booking: Booking;
  type: Scalars['String']['output'];
  template: Scalars['String']['output'];
  content: Scalars['String']['output'];
  signedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type DepositTransaction = {
  id: Scalars['UUID']['output'];
  booking: Booking;
  action: DepositAction;
  amount: Scalars['Money']['output'];
  status: TransactionStatus;
  transactionId?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type AICommandResult = {
  ok: Scalars['Boolean']['output'];
  message?: Maybe<Scalars['String']['output']>;
  affectedIds: Array<Scalars['UUID']['output']>;
  preview?: Maybe<Scalars['JSON']['output']>;
};

export type PriceBreakdown = {
  basePrice: Scalars['Money']['output'];
  cleaningFee?: Maybe<Scalars['Money']['output']>;
  serviceFee?: Maybe<Scalars['Money']['output']>;
  taxes?: Maybe<Scalars['Money']['output']>;
  total: Scalars['Money']['output'];
};

export type ServiceFee = {
  type: Scalars['String']['output'];
  amount: Scalars['Money']['output'];
  description?: Maybe<Scalars['String']['output']>;
};

export type BookingConnection = {
  edges: Array<BookingEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type BookingEdge = {
  node: Booking;
  cursor: Scalars['String']['output'];
};

export type PageInfo = {
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
  endCursor?: Maybe<Scalars['String']['output']>;
};

export type CalendarDay = {
  date: Scalars['DateTime']['output'];
  status: AvailabilityStatus;
  bookingId?: Maybe<Scalars['UUID']['output']>;
  note?: Maybe<Scalars['String']['output']>;
};

export type CreateBookingInput = {
  orgId: Scalars['UUID']['input'];
  unitId: Scalars['UUID']['input'];
  guest: GuestInput;
  checkIn: Scalars['DateTime']['input'];
  checkOut: Scalars['DateTime']['input'];
  guestsCount: Scalars['Int']['input'];
  priceBreakdown: PriceBreakdownInput;
  notes?: InputMaybe<Scalars['String']['input']>;
  source?: InputMaybe<BookingSource>;
};

export type GuestInput = {
  name: Scalars['String']['input'];
  email: Scalars['String']['input'];
  phone?: InputMaybe<Scalars['String']['input']>;
  documentType?: InputMaybe<Scalars['String']['input']>;
  documentNumber?: InputMaybe<Scalars['String']['input']>;
};

export type PriceBreakdownInput = {
  basePrice: MoneyInput;
  cleaningFee?: InputMaybe<MoneyInput>;
  serviceFee?: InputMaybe<MoneyInput>;
  taxes?: InputMaybe<MoneyInput>;
  total: MoneyInput;
};

export type MoneyInput = {
  amount: Scalars['Float']['input'];
  currency: Scalars['String']['input'];
};

export type AvailabilityStatus =
  | 'AVAILABLE'
  | 'BLOCKED'
  | 'BOOKED';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type BookingSource =
  | 'DIRECT'
  | 'AIRBNB'
  | 'BOOKING_COM'
  | 'AVITO'
  | 'OTHER';

export type DepositAction =
  | 'HOLD'
  | 'RELEASE'
  | 'CHARGE'
  | 'REFUND';

export type TransactionStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED';

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};

export type LegacyStitchingResolver<TResult, TParent, TContext, TArgs> = {
  fragment: string;
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};

export type NewStitchingResolver<TResult, TParent, TContext, TArgs> = {
  selectionSet: string | ((fieldNode: FieldNode) => SelectionSetNode);
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type StitchingResolver<TResult, TParent, TContext, TArgs> = LegacyStitchingResolver<TResult, TParent, TContext, TArgs> | NewStitchingResolver<TResult, TParent, TContext, TArgs>;
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>
  | StitchingResolver<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  UUID: ResolverTypeWrapper<Scalars['UUID']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Money: ResolverTypeWrapper<Scalars['Money']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Query: ResolverTypeWrapper<{}>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  Organization: ResolverTypeWrapper<Organization>;
  Property: ResolverTypeWrapper<Property>;
  Unit: ResolverTypeWrapper<Unit>;
  Booking: ResolverTypeWrapper<Booking>;
  Guest: ResolverTypeWrapper<Guest>;
  Document: ResolverTypeWrapper<Document>;
  DepositTransaction: ResolverTypeWrapper<DepositTransaction>;
  AICommandResult: ResolverTypeWrapper<AICommandResult>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  PriceBreakdown: ResolverTypeWrapper<PriceBreakdown>;
  ServiceFee: ResolverTypeWrapper<ServiceFee>;
  BookingConnection: ResolverTypeWrapper<BookingConnection>;
  BookingEdge: ResolverTypeWrapper<BookingEdge>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  CalendarDay: ResolverTypeWrapper<CalendarDay>;
  CreateBookingInput: CreateBookingInput;
  GuestInput: GuestInput;
  PriceBreakdownInput: PriceBreakdownInput;
  MoneyInput: MoneyInput;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  AvailabilityStatus: AvailabilityStatus;
  BookingStatus: BookingStatus;
  BookingSource: BookingSource;
  DepositAction: DepositAction;
  TransactionStatus: TransactionStatus;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  UUID: Scalars['UUID']['output'];
  DateTime: Scalars['DateTime']['output'];
  Money: Scalars['Money']['output'];
  JSON: Scalars['JSON']['output'];
  Query: {};
  Int: Scalars['Int']['output'];
  String: Scalars['String']['output'];
  Mutation: {};
  Organization: Organization;
  Property: Property;
  Unit: Unit;
  Booking: Booking;
  Guest: Guest;
  Document: Document;
  DepositTransaction: DepositTransaction;
  AICommandResult: AICommandResult;
  Boolean: Scalars['Boolean']['output'];
  PriceBreakdown: PriceBreakdown;
  ServiceFee: ServiceFee;
  BookingConnection: BookingConnection;
  BookingEdge: BookingEdge;
  PageInfo: PageInfo;
  CalendarDay: CalendarDay;
  CreateBookingInput: CreateBookingInput;
  GuestInput: GuestInput;
  PriceBreakdownInput: PriceBreakdownInput;
  MoneyInput: MoneyInput;
  Float: Scalars['Float']['output'];
}>;

export interface UUIDScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['UUID'], any> {
  name: 'UUID';
}

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface MoneyScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Money'], any> {
  name: 'Money';
}

export interface JSONScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type QueryResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  property?: Resolver<Maybe<ResolversTypes['Property']>, ParentType, ContextType, RequireFields<QuerypropertyArgs, 'id'>>;
  unit?: Resolver<Maybe<ResolversTypes['Unit']>, ParentType, ContextType, RequireFields<QueryunitArgs, 'id'>>;
  booking?: Resolver<Maybe<ResolversTypes['Booking']>, ParentType, ContextType, RequireFields<QuerybookingArgs, 'id'>>;
  bookings?: Resolver<ResolversTypes['BookingConnection'], ParentType, ContextType, Partial<QuerybookingsArgs>>;
}>;

export type MutationResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  createProperty?: Resolver<ResolversTypes['Property'], ParentType, ContextType, RequireFields<MutationcreatePropertyArgs, 'orgId' | 'title' | 'address'>>;
  createUnit?: Resolver<ResolversTypes['Unit'], ParentType, ContextType, RequireFields<MutationcreateUnitArgs, 'propertyId' | 'name' | 'capacity' | 'beds' | 'bathrooms'>>;
  blockDates?: Resolver<Array<ResolversTypes['CalendarDay']>, ParentType, ContextType, RequireFields<MutationblockDatesArgs, 'unitId' | 'from' | 'to'>>;
  createBooking?: Resolver<ResolversTypes['Booking'], ParentType, ContextType, RequireFields<MutationcreateBookingArgs, 'input'>>;
  cancelBooking?: Resolver<ResolversTypes['Booking'], ParentType, ContextType, RequireFields<MutationcancelBookingArgs, 'id'>>;
  changeBookingDates?: Resolver<ResolversTypes['Booking'], ParentType, ContextType, RequireFields<MutationchangeBookingDatesArgs, 'id' | 'checkIn' | 'checkOut'>>;
  generateContract?: Resolver<ResolversTypes['Document'], ParentType, ContextType, RequireFields<MutationgenerateContractArgs, 'bookingId'>>;
  depositAction?: Resolver<ResolversTypes['DepositTransaction'], ParentType, ContextType, RequireFields<MutationdepositActionArgs, 'bookingId' | 'action'>>;
  aiCommand?: Resolver<ResolversTypes['AICommandResult'], ParentType, ContextType, RequireFields<MutationaiCommandArgs, 'orgId' | 'command'>>;
}>;

export type OrganizationResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Organization'] = ResolversParentTypes['Organization']> = ResolversObject<{
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PropertyResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Property'] = ResolversParentTypes['Property']> = ResolversObject<{
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  org?: Resolver<ResolversTypes['Organization'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  amenities?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UnitResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Unit'] = ResolversParentTypes['Unit']> = ResolversObject<{
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  property?: Resolver<ResolversTypes['Property'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  capacity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  beds?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  bathrooms?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  amenities?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  calendar?: Resolver<Array<ResolversTypes['CalendarDay']>, ParentType, ContextType, RequireFields<UnitcalendarArgs, 'rangeStart' | 'rangeEnd'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BookingResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Booking'] = ResolversParentTypes['Booking']> = ResolversObject<{
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  org?: Resolver<ResolversTypes['Organization'], ParentType, ContextType>;
  unit?: Resolver<ResolversTypes['Unit'], ParentType, ContextType>;
  guest?: Resolver<ResolversTypes['Guest'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['BookingStatus'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['BookingSource'], ParentType, ContextType>;
  checkIn?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  checkOut?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  guestsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  priceBreakdown?: Resolver<ResolversTypes['PriceBreakdown'], ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  cancellationReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GuestResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Guest'] = ResolversParentTypes['Guest']> = ResolversObject<{
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  phone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  documentType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  documentNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DocumentResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Document'] = ResolversParentTypes['Document']> = ResolversObject<{
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  booking?: Resolver<ResolversTypes['Booking'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  template?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  signedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DepositTransactionResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['DepositTransaction'] = ResolversParentTypes['DepositTransaction']> = ResolversObject<{
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  booking?: Resolver<ResolversTypes['Booking'], ParentType, ContextType>;
  action?: Resolver<ResolversTypes['DepositAction'], ParentType, ContextType>;
  amount?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['TransactionStatus'], ParentType, ContextType>;
  transactionId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AICommandResultResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['AICommandResult'] = ResolversParentTypes['AICommandResult']> = ResolversObject<{
  ok?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  affectedIds?: Resolver<Array<ResolversTypes['UUID']>, ParentType, ContextType>;
  preview?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PriceBreakdownResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['PriceBreakdown'] = ResolversParentTypes['PriceBreakdown']> = ResolversObject<{
  basePrice?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  cleaningFee?: Resolver<Maybe<ResolversTypes['Money']>, ParentType, ContextType>;
  serviceFee?: Resolver<Maybe<ResolversTypes['Money']>, ParentType, ContextType>;
  taxes?: Resolver<Maybe<ResolversTypes['Money']>, ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ServiceFeeResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['ServiceFee'] = ResolversParentTypes['ServiceFee']> = ResolversObject<{
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  amount?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BookingConnectionResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['BookingConnection'] = ResolversParentTypes['BookingConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['BookingEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BookingEdgeResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['BookingEdge'] = ResolversParentTypes['BookingEdge']> = ResolversObject<{
  node?: Resolver<ResolversTypes['Booking'], ParentType, ContextType>;
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CalendarDayResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['CalendarDay'] = ResolversParentTypes['CalendarDay']> = ResolversObject<{
  date?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['AvailabilityStatus'], ParentType, ContextType>;
  bookingId?: Resolver<Maybe<ResolversTypes['UUID']>, ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = MeshContext> = ResolversObject<{
  UUID?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  Money?: GraphQLScalarType;
  JSON?: GraphQLScalarType;
  Query?: QueryResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Organization?: OrganizationResolvers<ContextType>;
  Property?: PropertyResolvers<ContextType>;
  Unit?: UnitResolvers<ContextType>;
  Booking?: BookingResolvers<ContextType>;
  Guest?: GuestResolvers<ContextType>;
  Document?: DocumentResolvers<ContextType>;
  DepositTransaction?: DepositTransactionResolvers<ContextType>;
  AICommandResult?: AICommandResultResolvers<ContextType>;
  PriceBreakdown?: PriceBreakdownResolvers<ContextType>;
  ServiceFee?: ServiceFeeResolvers<ContextType>;
  BookingConnection?: BookingConnectionResolvers<ContextType>;
  BookingEdge?: BookingEdgeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  CalendarDay?: CalendarDayResolvers<ContextType>;
}>;


export type MeshContext = SupergraphTypes.Context & BaseMeshContext;


import { fileURLToPath } from '@graphql-mesh/utils';
const baseDir = pathModule.join(pathModule.dirname(fileURLToPath(import.meta.url)), '..');

const importFn: ImportFn = <T>(moduleId: string) => {
  const relativeModuleId = (pathModule.isAbsolute(moduleId) ? pathModule.relative(baseDir, moduleId) : moduleId).split('\\').join('/').replace(baseDir + '/', '');
  switch(relativeModuleId) {
    default:
      return Promise.reject(new Error(`Cannot find module '${relativeModuleId}'.`));
  }
};

const rootStore = new MeshStore('.mesh', new FsStoreStorageAdapter({
  cwd: baseDir,
  importFn,
  fileType: "ts",
}), {
  readonly: true,
  validate: false
});

export function getMeshOptions() {
  console.warn('WARNING: These artifacts are built for development mode. Please run "mesh build" to build production artifacts');
  return findAndParseConfig({
    dir: baseDir,
    artifactsDir: ".mesh",
    configName: "mesh",
    additionalPackagePrefixes: [],
    initialLoggerPrefix: "",
  });
}

export function createBuiltMeshHTTPHandler<TServerContext = {}>(): MeshHTTPHandler<TServerContext> {
  return createMeshHTTPHandler<TServerContext>({
    baseDir,
    getBuiltMesh: getBuiltMesh,
    rawServeConfig: {"port":4000},
  })
}

let meshInstance$: Promise<MeshInstance> | undefined;

export const pollingInterval = null;

export function getBuiltMesh(): Promise<MeshInstance> {
  if (meshInstance$ == null) {
    if (pollingInterval) {
      setInterval(() => {
        getMeshOptions()
        .then(meshOptions => getMesh(meshOptions))
        .then(newMesh =>
          meshInstance$.then(oldMesh => {
            oldMesh.destroy()
            meshInstance$ = Promise.resolve(newMesh)
          })
        ).catch(err => {
          console.error("Mesh polling failed so the existing version will be used:", err);
        });
      }, pollingInterval)
    }
    meshInstance$ = getMeshOptions().then(meshOptions => getMesh(meshOptions)).then(mesh => {
      const id = mesh.pubsub.subscribe('destroy', () => {
        meshInstance$ = undefined;
        mesh.pubsub.unsubscribe(id);
      });
      return mesh;
    });
  }
  return meshInstance$;
}

export const execute: ExecuteMeshFn = (...args) => getBuiltMesh().then(({ execute }) => execute(...args));

export const subscribe: SubscribeMeshFn = (...args) => getBuiltMesh().then(({ subscribe }) => subscribe(...args));