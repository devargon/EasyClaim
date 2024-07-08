-- AlterTable
ALTER TABLE `expense` ADD COLUMN `claimId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_claimId_fkey` FOREIGN KEY (`claimId`) REFERENCES `Claim`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
