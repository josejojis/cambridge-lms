-- AlterTable
ALTER TABLE "two_factors" ADD COLUMN     "failed_verification_count" INTEGER DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMP(3),
ADD COLUMN     "verified" BOOLEAN DEFAULT true;

-- CreateIndex
CREATE INDEX "two_factors_secret_idx" ON "two_factors"("secret");

