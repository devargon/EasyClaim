-- CreateTable
CREATE TABLE `userotp` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(50) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `requestType` VARCHAR(100) NOT NULL,
    `isUsed` BOOLEAN NOT NULL DEFAULT false,
    `isOverwritten` BOOLEAN NOT NULL DEFAULT false,
    `secret` VARCHAR(255) NOT NULL DEFAULT '0',
    `otp` VARCHAR(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `userotp` ADD CONSTRAINT `userotp_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
