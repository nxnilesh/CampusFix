-- Migration: Security Upgrade - Add ResolverRequest, IssueVote, ActivityLog, User status field

-- Add status column to User (non-breaking: has default)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- CreateTable: IssueVote (one vote per user per issue)
CREATE TABLE IF NOT EXISTS "IssueVote" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ResolverRequest (application workflow)
CREATE TABLE IF NOT EXISTS "ResolverRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "employeeId" TEXT,
    "department" TEXT NOT NULL,
    "designation" TEXT,
    "reason" TEXT NOT NULL,
    "documentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResolverRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ActivityLog (audit trail)
CREATE TABLE IF NOT EXISTS "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityId" TEXT,
    "entityType" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: IssueVote unique constraint (one vote per user per issue)
CREATE UNIQUE INDEX IF NOT EXISTS "IssueVote_issueId_userId_key" ON "IssueVote"("issueId", "userId");
CREATE INDEX IF NOT EXISTS "IssueVote_issueId_idx" ON "IssueVote"("issueId");
CREATE INDEX IF NOT EXISTS "IssueVote_userId_idx" ON "IssueVote"("userId");

-- CreateIndex: ResolverRequest
CREATE UNIQUE INDEX IF NOT EXISTS "ResolverRequest_userId_key" ON "ResolverRequest"("userId");
CREATE INDEX IF NOT EXISTS "ResolverRequest_status_idx" ON "ResolverRequest"("status");
CREATE INDEX IF NOT EXISTS "ResolverRequest_userId_idx" ON "ResolverRequest"("userId");

-- CreateIndex: ActivityLog
CREATE INDEX IF NOT EXISTS "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX IF NOT EXISTS "ActivityLog_action_idx" ON "ActivityLog"("action");
CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex: User status
CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");

-- AddForeignKey: IssueVote
ALTER TABLE "IssueVote" ADD CONSTRAINT "IssueVote_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssueVote" ADD CONSTRAINT "IssueVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ResolverRequest
ALTER TABLE "ResolverRequest" ADD CONSTRAINT "ResolverRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ActivityLog
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
