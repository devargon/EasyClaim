/*
  Warnings:

  - Added the required column `fileSize` to the `Attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `Attachment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `attachment` ADD COLUMN `fileSize` INTEGER NOT NULL,
    ADD COLUMN `mimeType` VARCHAR(191) NOT NULL;
