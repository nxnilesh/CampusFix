export type UserRole = 'student' | 'resolver' | 'admin';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'DELETED';

export type IssueCategory =
  | 'Electrical'
  | 'Furniture'
  | 'AC & Cooling'
  | 'Plumbing'
  | 'Cleanliness'
  | 'Wi-Fi / Network'
  | 'Laboratory'
  | 'Safety'
  | 'Infrastructure'
  | 'Other'
  | string;

export type CampusLocation =
  | 'Academic Block'
  | 'CSE Block'
  | 'Computer Lab'
  | 'Library'
  | 'Seminar Hall'
  | 'Canteen'
  | 'Washroom'
  | 'Parking Area'
  | 'Classroom'
  | 'Corridor'
  | 'Other'
  | string;

export type IssuePriority = 'Low' | 'Medium' | 'High';

export type IssueStatus =
  | 'Reported'
  | 'Acknowledged'
  | 'Under Review'
  | 'In Progress'
  | 'Resolved'
  | 'Closed'
  | 'Rejected';

export type ResolverRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface User {
  id: string;
  userId: string; // e.g. STU1001, RES1001, ADM1001
  email: string;
  name: string;
  role: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
  department?: string | null;
  year?: string | null;
  studentId?: string | null;
  phone?: string | null;
  avatar?: string | null;
  isActive?: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  emailNotifications: boolean;
  statusAlerts: boolean;
  updatedAt: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  isActive: boolean;
  services?: ServiceItem[];
  _count?: { issues: number };
}

export interface ServiceItem {
  id: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string; icon?: string | null };
  slaHours?: number;
  isActive: boolean;
  _count?: { issues: number };
}

export interface IssueCommentItem {
  id: string;
  issueId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    role: string;
  };
}

export interface IssueStatusHistoryItem {
  id: string;
  issueId: string;
  previousStatus: string;
  newStatus: string;
  resolverId?: string | null;
  resolverName?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface Issue {
  id: string; // e.g. CF-2026-1047
  studentId: string;
  title: string;
  category: IssueCategory;
  categoryId?: string | null;
  categoryName?: string;
  serviceId?: string | null;
  service?: ServiceItem | null;
  location: CampusLocation;
  room: string;
  priority: IssuePriority;
  description: string;
  imageUrl?: string | null;
  status: IssueStatus;
  resolverId?: string | null;
  resolutionNote?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  voteCount?: number;
  student?: {
    id: string;
    name: string;
    userId: string;
    email?: string;
    department?: string | null;
    year?: string | null;
  };
  resolver?: {
    id: string;
    name: string;
    userId: string;
    email?: string;
  } | null;
  history?: IssueStatusHistoryItem[];
  comments?: IssueCommentItem[];
  _count?: { votes: number; comments: number };
}

export type IssueItem = Issue;

export interface NotificationItem {
  id: string;
  userId: string;
  issueId?: string | null;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface CampusAnalytics {
  totalIssues: number;
  resolvedIssues: number;
  inProgressIssues?: number;
  acknowledgedIssues?: number;
  reportedIssues?: number;
  unresolvedIssues: number;
  highPriorityIssues: number;
  resolutionRate: number; // percentage 0-100
  mostReportedCategory: string;
  mostAffectedLocation: string;
  categoryDistribution: { category: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
  priorityDistribution: { priority: string; count: number }[];
  locationDistribution?: { location: string; count: number }[];
  recentActivity: IssueStatusHistoryItem[];
}

export interface ResolverRequest {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  employeeId?: string | null;
  department: string;
  designation?: string | null;
  reason: string;
  documentUrl?: string | null;
  status: ResolverRequestStatus;
  adminNote?: string | null;
  rejectionReason?: string | null;
  reviewedById?: string | null;
  reviewedBy?: Pick<User, 'id' | 'userId' | 'name'> | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, 'id' | 'userId' | 'name' | 'email' | 'role' | 'status' | 'emailVerified' | 'department'>;
}

export interface ActivityLog {
  id: string;
  userId?: string | null;
  action: string;
  entityId?: string | null;
  entityType?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { name: string; userId: string; role: string } | null;
}

export interface LoginActivityItem {
  id: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user?: { id: string; name: string; userId: string; email: string; role: string } | null;
}

export interface AdminDashboardData {
  totalStudents: number;
  totalResolvers: number;
  pendingRequests: number;
  totalIssues: number;
  resolvedIssues: number;
  openIssues: number;
  highPriorityIssues: number;
  recentLogs: ActivityLog[];
}

export interface PublicDashboardData {
  stats: {
    totalIssues: number;
    resolvedIssues: number;
    openIssues: number;
    resolutionRate: number;
  };
  topVoted: PublicIssueItem[];
  recentlyResolved: PublicIssueItem[];
  categoryDistribution: { category: string; count: number }[];
  highPriorityOpen: PublicIssueItem[];
}

export interface PublicIssueItem {
  id: string;
  title: string;
  category: string;
  location: string;
  priority?: string;
  status: string;
  votes: number;
  createdAt?: string;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
