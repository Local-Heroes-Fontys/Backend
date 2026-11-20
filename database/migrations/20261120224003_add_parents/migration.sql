-- CreateTable
CREATE TABLE `parents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(254) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `parents_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
