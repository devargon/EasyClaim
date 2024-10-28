/*
  Warnings:

  - You are about to drop the column `hasSeenWelcomePage` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user` DROP COLUMN `hasSeenWelcomePage`;

-- CreateTable
CREATE TABLE `UserFlags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `HAS_SEEN_WELCOME_PAGE` BOOLEAN NOT NULL DEFAULT false,
    `WARN_OAUTH_EMAIL_DIFFERENT` BOOLEAN NOT NULL DEFAULT false,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `UserFlags_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserFlags` ADD CONSTRAINT `UserFlags_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
