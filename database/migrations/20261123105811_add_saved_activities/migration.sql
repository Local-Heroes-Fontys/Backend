-- CreateTable
CREATE TABLE `saved_activities` (
    `childId` INTEGER NOT NULL,
    `activityId` INTEGER NOT NULL,
    `savedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `saved_activities_activityId_idx`(`activityId`),
    PRIMARY KEY (`childId`, `activityId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `saved_activities` ADD CONSTRAINT `saved_activities_childId_fkey` FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_activities` ADD CONSTRAINT `saved_activities_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `activities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
