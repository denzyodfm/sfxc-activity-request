-- AlterTable
ALTER TABLE `User` ADD COLUMN `failedLoginCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `lockedUntil` DATETIME(3) NULL,
    ADD COLUMN `tokenVersion` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `ActivityRequest_status_date_idx` ON `ActivityRequest`(`status`, `date`);

-- CreateIndex
CREATE INDEX `ActivityRequest_status_idx` ON `ActivityRequest`(`status`);

-- CreateIndex
CREATE INDEX `ActivityRequest_createdAt_idx` ON `ActivityRequest`(`createdAt`);

-- CreateIndex
CREATE INDEX `AuditLog_createdAt_idx` ON `AuditLog`(`createdAt`);

-- CreateIndex
CREATE INDEX `FundLedgerEntry_fundSourceId_createdAt_idx` ON `FundLedgerEntry`(`fundSourceId`, `createdAt`);
