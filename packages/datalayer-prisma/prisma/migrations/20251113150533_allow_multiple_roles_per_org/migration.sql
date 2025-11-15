-- DropIndex
DROP INDEX IF EXISTS "Membership_userId_orgId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_orgId_role_key" ON "Membership"("userId", "orgId", "role");

-- CreateIndex
CREATE INDEX "Membership_userId_orgId_idx" ON "Membership"("userId", "orgId");

