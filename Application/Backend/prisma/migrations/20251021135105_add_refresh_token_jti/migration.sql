/*
  Warnings:

  - A unique constraint covering the columns `[jti]` on the table `refresh_tokens` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expiresAt` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jti` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "jti" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_jti_key" ON "refresh_tokens"("jti");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");
