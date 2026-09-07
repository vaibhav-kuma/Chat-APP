export interface User {
  id: string;
  email: string;
  name: string;
  role: "MEMBER" | "ADMIN";
  avatarUrl?: string | null;
}

export interface Membership {
  isActive: boolean;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd?: string | null;
    gracePeriodEnd?: string | null;
    failedPaymentCount?: number;
    cancelAtPeriodEnd?: boolean;
  } | null;
}

export interface MeResponse {
  user: User;
  membership: Membership;
}

export interface Plan {
  id: string;
  name: string;
  description?: string | null;
  pricePaise: number;
  currency: string;
  billingCycle: string;
  trialDays: number;
  isActive: boolean;
}

export interface Video {
  id: string;
  title: string;
  description?: string | null;
  categoryId?: string | null;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  status: string;
  publishedAt?: string | null;
  viewCount: number;
  createdAt: string;
  category?: { id: string; name: string; slug: string } | null;
}

export interface LiveStream {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  streamKey?: string | null;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "RECORDING_PROCESSING";
}

export interface Comment {
  id: string;
  body: string;
  userId: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string | null };
  replies?: Comment[];
}

export interface ChatMessage {
  id: string;
  body: string;
  userId: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string | null };
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface SubscriptionStatusResponse {
  isActive: boolean;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd?: string | null;
    gracePeriodEnd?: string | null;
    failedPaymentCount?: number;
    cancelAtPeriodEnd?: boolean;
    plan: Plan;
  } | null;
}
