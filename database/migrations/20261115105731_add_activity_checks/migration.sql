-- Written by hand: Prisma's schema language can't describe CHECK constraints, so they live only
-- here. They repeat the most important rules from src/validators/activities.validator.ts, so the
-- data stays valid even when something other than the API writes to these tables
-- (a seed script, a manual SQL fix, a future admin tool).
-- MySQL rejects any INSERT or UPDATE that breaks one of these with error 3819.

ALTER TABLE `activities`
    ADD CONSTRAINT `activities_name_not_blank` CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),
    ADD CONSTRAINT `activities_max_age_range` CHECK (`maxAge` <= 99),
    ADD CONSTRAINT `activities_min_age_not_above_max_age` CHECK (`minAge` <= `maxAge`),
    ADD CONSTRAINT `activities_start_time_format` CHECK (`startTime` REGEXP '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
    ADD CONSTRAINT `activities_end_time_format` CHECK (`endTime` REGEXP '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
    ADD CONSTRAINT `activities_start_before_end` CHECK (`startTime` < `endTime`);

ALTER TABLE `cost_items`
    ADD CONSTRAINT `cost_items_amount_not_negative` CHECK (`amount` >= 0);
