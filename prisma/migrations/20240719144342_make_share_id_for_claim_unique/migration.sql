/*
  Warnings:

  - A unique constraint covering the columns `[shareId]` on the table `Claim` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Claim_shareId_key` ON `Claim`(`shareId`);
