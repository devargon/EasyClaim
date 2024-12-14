/*
  Warnings:

  - You are about to drop the column `ipAddress` on the `audit_log` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `audit_log` DROP COLUMN `ipAddress`,
    ADD COLUMN `ipAddressV4` VARCHAR(15) NULL,
    ADD COLUMN `ipAddressV6` VARCHAR(39) NULL;
