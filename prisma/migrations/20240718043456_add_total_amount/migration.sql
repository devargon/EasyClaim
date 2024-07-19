/*
  Warnings:

  - Made the column `claimOffset` on table `claim` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `claim` ADD COLUMN `totalAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    MODIFY `claimOffset` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
