/*
  Warnings:

  - Added the required column `email` to the `user_connections` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `user_connections` ADD COLUMN `email` VARCHAR(191) NOT NULL;
