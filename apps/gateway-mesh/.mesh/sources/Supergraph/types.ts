// @ts-nocheck

import { InContextSdkMethod } from '@graphql-mesh/types';
import { MeshContext } from '@graphql-mesh/runtime';

export namespace SupergraphTypes {
  export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
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

  export type QuerySdk = {
      /** undefined **/
  property: InContextSdkMethod<Query['property'], QuerypropertyArgs, MeshContext>,
  /** undefined **/
  unit: InContextSdkMethod<Query['unit'], QueryunitArgs, MeshContext>,
  /** undefined **/
  booking: InContextSdkMethod<Query['booking'], QuerybookingArgs, MeshContext>,
  /** undefined **/
  bookings: InContextSdkMethod<Query['bookings'], QuerybookingsArgs, MeshContext>
  };

  export type MutationSdk = {
      /** undefined **/
  createProperty: InContextSdkMethod<Mutation['createProperty'], MutationcreatePropertyArgs, MeshContext>,
  /** undefined **/
  createUnit: InContextSdkMethod<Mutation['createUnit'], MutationcreateUnitArgs, MeshContext>,
  /** undefined **/
  blockDates: InContextSdkMethod<Mutation['blockDates'], MutationblockDatesArgs, MeshContext>,
  /** undefined **/
  createBooking: InContextSdkMethod<Mutation['createBooking'], MutationcreateBookingArgs, MeshContext>,
  /** undefined **/
  cancelBooking: InContextSdkMethod<Mutation['cancelBooking'], MutationcancelBookingArgs, MeshContext>,
  /** undefined **/
  changeBookingDates: InContextSdkMethod<Mutation['changeBookingDates'], MutationchangeBookingDatesArgs, MeshContext>,
  /** undefined **/
  generateContract: InContextSdkMethod<Mutation['generateContract'], MutationgenerateContractArgs, MeshContext>,
  /** undefined **/
  depositAction: InContextSdkMethod<Mutation['depositAction'], MutationdepositActionArgs, MeshContext>,
  /** undefined **/
  aiCommand: InContextSdkMethod<Mutation['aiCommand'], MutationaiCommandArgs, MeshContext>
  };

  export type SubscriptionSdk = {
    
  };

  export type Context = {
      ["Supergraph"]: { Query: QuerySdk, Mutation: MutationSdk, Subscription: SubscriptionSdk },
      
    };
}
