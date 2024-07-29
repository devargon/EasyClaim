/*
  Warnings:

  - Added the required column `fileObjectUrl` to the `Attachment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `attachment` ADD COLUMN `fileObjectUrl` VARCHAR(300) NOT NULL;
