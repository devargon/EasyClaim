-- AlterTable
ALTER TABLE `claim` ADD COLUMN `totalAmountAfterOffset` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
