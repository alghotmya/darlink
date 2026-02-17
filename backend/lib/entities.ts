/**
 * DarLink Phase 1 — Domain entities and DynamoDB key patterns.
 * Geography: UAE, GCC, Egypt. No agents in MVP (agentId optional for Phase 2).
 */

// Supported regions for Phase 1
export const SUPPORTED_COUNTRIES = ['AE', 'SA', 'BH', 'KW', 'OM', 'QA', 'EG'] as const;
export const SUPPORTED_REGIONS = ['UAE', 'GCC', 'Egypt'] as const;
export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number];
export type Region = (typeof SUPPORTED_REGIONS)[number];

export type OrgType = 'brokerage' | 'landlord' | 'property_manager';
export type UserRole = 'viewer' | 'tenant' | 'buyer' | 'landlord' | 'seller' | 'agent' | 'property_manager' | 'admin';
export type ListingType = 'rent' | 'sale';
/** Lifecycle: draft → published (listable) → leased|sold (closed) or paused|archived */
export type ListingStatus = 'draft' | 'published' | 'paused' | 'archived' | 'leased' | 'sold';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'closed';
export type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'declined';
export type ContractStatus = 'draft' | 'pending_signature' | 'signed' | 'cancelled';

export interface Organization {
  orgId: string;
  name: string;
  type: OrgType;
  countryCode?: CountryCode;
  region?: Region;
  createdAt: string;
  updatedAt: string;
}

export interface UserOrgMembership {
  userId: string;
  orgId: string;
  role: UserRole;
  joinedAt: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  name?: string;
  phone?: string;
  orgIds: string[];
  roles: Record<string, UserRole>; // orgId -> role
  createdAt: string;
  updatedAt: string;
}

/** S3 key for a single property image (e.g. orgId/listingId/uuid.jpg) */
export type MediaKey = string;

export interface Listing {
  listingId: string;
  orgId: string;
  status: ListingStatus;
  type: ListingType;
  title: string;
  description?: string;
  price: number;
  currency: string;
  countryCode: CountryCode;
  region?: Region;
  city?: string;
  area?: string;
  address?: string;
  lat?: number;
  lng?: number;
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  /** S3 object keys for property pictures (order = display order) */
  mediaKeys: MediaKey[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  /** Set when status becomes leased or sold */
  closedAt?: string;
}

export interface Lead {
  leadId: string;
  listingId: string;
  orgId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  status: LeadStatus;
  assignedToUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  applicationId: string;
  listingId: string;
  orgId: string;
  applicantUserId?: string;
  applicantEmail: string;
  applicantName: string;
  docKeys: string[];
  status: ApplicationStatus;
  consentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Offer {
  offerId: string;
  listingId: string;
  orgId: string;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  contractId: string;
  listingId: string;
  orgId: string;
  status: ContractStatus;
  signedAt?: string;
  pdfKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  auditId: string;
  orgId: string;
  actorUserId?: string;
  entityType: string;
  entityId: string;
  action: string;
  timestamp: string;
  diffSummary?: string;
}

export interface Invite {
  inviteId: string;
  orgId: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
}

// ——— DynamoDB single-table key patterns ———
export const PK = {
  org: (orgId: string) => `ORG#${orgId}`,
  orgListing: (orgId: string, listingId: string) => `ORG#${orgId}#LISTING#${listingId}`,
  orgLead: (orgId: string, leadId: string) => `ORG#${orgId}#LEAD#${leadId}`,
  orgApplication: (orgId: string, appId: string) => `ORG#${orgId}#APPLICATION#${appId}`,
  orgInvite: (orgId: string, inviteId: string) => `ORG#${orgId}#INVITE#${inviteId}`,
  orgAudit: (orgId: string, timestamp: string, auditId: string) => `ORG#${orgId}#AUDIT#${timestamp}#${auditId}`,
  // Public browse: entity type + id for listing/org profile
  entityListing: (listingId: string) => `ENTITY#LISTING#${listingId}`,
  entityOrg: (orgId: string) => `ENTITY#ORG#${orgId}`,
} as const;

export const SK = {
  meta: () => 'META',
  user: (userId: string) => `USER#${userId}`,
  listing: (listingId: string) => `LISTING#${listingId}`,
  lead: (leadId: string) => `LEAD#${leadId}`,
  application: (appId: string) => `APPLICATION#${appId}`,
  invite: (inviteId: string) => `INVITE#${inviteId}`,
  audit: (timestamp: string, auditId: string) => `AUDIT#${timestamp}#${auditId}`,
} as const;
