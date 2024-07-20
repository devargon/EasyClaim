/*
  Warnings:

  - Made the column `shareId` on table `claim` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `claim` MODIFY `shareId` VARCHAR(191) NOT NULL;
