ALTER TABLE "ResolverRequest"
ADD COLUMN "rejectionReason" TEXT;

DROP INDEX IF EXISTS "ResolverRequest_userId_key";

CREATE UNIQUE INDEX "ResolverRequest_one_pending_per_user_key"
ON "ResolverRequest"("userId")
WHERE "status" = 'PENDING';

ALTER TABLE "ResolverRequest"
ADD CONSTRAINT "ResolverRequest_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
