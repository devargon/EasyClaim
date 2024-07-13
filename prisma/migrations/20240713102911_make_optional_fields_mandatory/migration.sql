/*
  Warnings:

  - Made the column `amount` on table `expense` required. This step will fail if there are existing NULL values in that column.
  - Made the column `categoryId` on table `expense` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `expense` DROP FOREIGN KEY `Expense_categoryId_fkey`;

-- AlterTable
ALTER TABLE `expense` MODIFY `amount` DECIMAL(10, 2) NOT NULL,
    MODIFY `categoryId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
