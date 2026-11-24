-- Partly written by hand. Prisma would DROP the old `email`/`phone` columns and could not add the
-- NOT NULL password column to a table that already has rows. Instead this migration renames the
-- columns and fills in values for the existing rows first.

-- ---------------------------------------------------------------------------
-- Club representatives
-- ---------------------------------------------------------------------------

-- Existing representatives get an empty hash, which no password can ever match.
ALTER TABLE `club_representatives`
    ADD COLUMN `passwordHash` VARCHAR(255) NOT NULL DEFAULT '',
    MODIFY `name` VARCHAR(100) NOT NULL;

ALTER TABLE `club_representatives` ALTER COLUMN `passwordHash` DROP DEFAULT;

-- ---------------------------------------------------------------------------
-- Sports clubs
-- ---------------------------------------------------------------------------

-- The description and contact details are optional, and NULL is the only way to say "not shared".
-- So blank values become NULL. A phone number longer than the new 20 characters also becomes NULL:
-- a cut-off number would be wrong, which is worse than no number.
UPDATE `sports_clubs`
SET `description` = NULLIF(TRIM(`description`), ''),
    `email` = NULLIF(TRIM(`email`), ''),
    `phone` = CASE WHEN CHAR_LENGTH(TRIM(`phone`)) BETWEEN 1 AND 20 THEN TRIM(`phone`) END;

ALTER TABLE `sports_clubs`
    RENAME COLUMN `email` TO `contactEmail`,
    RENAME COLUMN `phone` TO `contactPhone`;

ALTER TABLE `sports_clubs`
    MODIFY `name` VARCHAR(150) NOT NULL,
    MODIFY `description` TEXT NULL,
    MODIFY `address` VARCHAR(255) NOT NULL,
    MODIFY `contactEmail` VARCHAR(254) NULL,
    MODIFY `contactPhone` VARCHAR(20) NULL,
    -- Stays NULL for existing clubs: we don't publish a person's name without the club choosing to.
    ADD COLUMN `contactName` VARCHAR(100) NULL,
    -- Clubs that existed before the approval status was added count as approved.
    -- New clubs start as PENDING (the default is changed right below).
    ADD COLUMN `approvalStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED';

ALTER TABLE `sports_clubs` ALTER COLUMN `approvalStatus` SET DEFAULT 'PENDING';

-- Like *_add_activity_checks: a safety net for data that doesn't come through the API.
-- Optional fields are either NULL or real text, never blank, so "not shared" has one meaning.
ALTER TABLE `sports_clubs`
    ADD CONSTRAINT `sports_clubs_name_not_blank` CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),
    ADD CONSTRAINT `sports_clubs_address_not_blank` CHECK (CHAR_LENGTH(TRIM(`address`)) > 0),
    ADD CONSTRAINT `sports_clubs_description_null_or_filled`
        CHECK (`description` IS NULL OR CHAR_LENGTH(TRIM(`description`)) > 0),
    ADD CONSTRAINT `sports_clubs_contact_name_null_or_filled`
        CHECK (`contactName` IS NULL OR CHAR_LENGTH(TRIM(`contactName`)) > 0),
    ADD CONSTRAINT `sports_clubs_contact_phone_null_or_filled`
        CHECK (`contactPhone` IS NULL OR CHAR_LENGTH(TRIM(`contactPhone`)) > 0),
    ADD CONSTRAINT `sports_clubs_contact_email_null_or_filled`
        CHECK (`contactEmail` IS NULL OR CHAR_LENGTH(TRIM(`contactEmail`)) > 0);
