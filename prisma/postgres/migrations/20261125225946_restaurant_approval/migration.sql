-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT false;


-- Sample restaurants stay visible after this change (they were all public before).
UPDATE "Restaurant" SET "isApproved" = true, "approvedAt" = CURRENT_TIMESTAMP WHERE "isSample" = true;
