/*
  Warnings:

  - You are about to alter the column `service` on the `user_connections` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(1))` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `user_connections` MODIFY `service` VARCHAR(191) NOT NULL;
