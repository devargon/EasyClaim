-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `hasSeenWelcomePage` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Claim` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('PENDING', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `totalAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `claimOffset` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `totalAmountAfterOffset` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `shareId` VARCHAR(191) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',

    UNIQUE INDEX `Claim_shareId_key`(`shareId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `icon` VARCHAR(30) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expense` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `spentOn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `editedAt` DATETIME(3) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `description` VARCHAR(191) NULL,
    `categoryId` INTEGER NOT NULL,
    `claimId` INTEGER NULL,
    `claimComplete` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attachment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uploaderId` INTEGER NOT NULL,
    `expenseId` INTEGER NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(300) NOT NULL,
    `fileObjectUrl` VARCHAR(300) NOT NULL,
    `mimeType` VARCHAR(300) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Claim` ADD CONSTRAINT `Claim_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_claimId_fkey` FOREIGN KEY (`claimId`) REFERENCES `Claim`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_uploaderId_fkey` FOREIGN KEY (`uploaderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `Expense`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
