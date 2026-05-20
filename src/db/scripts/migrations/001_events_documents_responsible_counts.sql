-- Миграция для уже развёрнутой БД (не для повторного применения на чистой установке из schema.sql без проверок).
-- Перед применением сделайте резервную копию.

-- 1) Вклад ответственного по мероприятию участия
ALTER TABLE `responsible_for_part_events`
  ADD COLUMN `responsible_participants` int unsigned DEFAULT NULL COMMENT 'вклад: участники' AFTER `date_of_result`,
  ADD COLUMN `responsible_winners` int unsigned DEFAULT NULL COMMENT 'вклад: победители' AFTER `responsible_participants`,
  ADD COLUMN `responsible_runner_up` int unsigned DEFAULT NULL COMMENT 'вклад: призёры' AFTER `responsible_winners`;

-- 2) Замена триггеров даты результата
DROP TRIGGER IF EXISTS `responsible_for_part_events_BEFORE_INSERT`;
DROP TRIGGER IF EXISTS `responsible_for_part_events_BEFORE_UPDATE`;

DELIMITER ;;
CREATE TRIGGER `responsible_for_part_events_BEFORE_INSERT` BEFORE INSERT ON `responsible_for_part_events` FOR EACH ROW
BEGIN
  IF (
    (NEW.`result_of_responsible` IS NULL OR TRIM(NEW.`result_of_responsible`) = '')
    AND NEW.`responsible_participants` IS NULL
    AND NEW.`responsible_winners` IS NULL
    AND NEW.`responsible_runner_up` IS NULL
  ) THEN
    SET NEW.`date_of_result` = NULL;
  ELSE
    SET NEW.`date_of_result` = CURRENT_DATE();
  END IF;
END;;
CREATE TRIGGER `responsible_for_part_events_BEFORE_UPDATE` BEFORE UPDATE ON `responsible_for_part_events` FOR EACH ROW
BEGIN
  IF (
    (NEW.`result_of_responsible` IS NULL OR TRIM(NEW.`result_of_responsible`) = '')
    AND NEW.`responsible_participants` IS NULL
    AND NEW.`responsible_winners` IS NULL
    AND NEW.`responsible_runner_up` IS NULL
  ) THEN
    SET NEW.`date_of_result` = NULL;
  ELSEIF NOT (
    OLD.`result_of_responsible` <=> NEW.`result_of_responsible`
    AND OLD.`responsible_participants` <=> NEW.`responsible_participants`
    AND OLD.`responsible_winners` <=> NEW.`responsible_winners`
    AND OLD.`responsible_runner_up` <=> NEW.`responsible_runner_up`
  ) THEN
    SET NEW.`date_of_result` = CURRENT_DATE();
  END IF;
END;;
DELIMITER ;

-- 3) Документы (две таблицы). Порядок: после event_plan_* и profile.
-- При ошибке FK проверьте, что таблицы `event_plan_organization`, `event_plan_participation`, `profile` существуют.

CREATE TABLE IF NOT EXISTS `event_organization_document` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_event` int unsigned NOT NULL,
  `storage_path` varchar(1024) NOT NULL COMMENT 'путь относительно EVENT_DOCUMENTS_ROOT_ORG',
  `original_filename` varchar(255) NOT NULL,
  `mime_type` varchar(128) DEFAULT NULL,
  `size_bytes` bigint unsigned DEFAULT NULL,
  `uploaded_by_profile_id` int unsigned DEFAULT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_eod_event` (`id_event`),
  KEY `fk_eod_profile` (`uploaded_by_profile_id`),
  CONSTRAINT `fk_eod_event` FOREIGN KEY (`id_event`) REFERENCES `event_plan_organization` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_eod_profile` FOREIGN KEY (`uploaded_by_profile_id`) REFERENCES `profile` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `event_participation_document` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_event` int unsigned NOT NULL,
  `storage_path` varchar(1024) NOT NULL COMMENT 'путь относительно EVENT_DOCUMENTS_ROOT_PART',
  `original_filename` varchar(255) NOT NULL,
  `mime_type` varchar(128) DEFAULT NULL,
  `size_bytes` bigint unsigned DEFAULT NULL,
  `uploaded_by_profile_id` int unsigned DEFAULT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_epd_event` (`id_event`),
  KEY `fk_epd_profile` (`uploaded_by_profile_id`),
  CONSTRAINT `fk_epd_event` FOREIGN KEY (`id_event`) REFERENCES `event_plan_participation` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_epd_profile` FOREIGN KEY (`uploaded_by_profile_id`) REFERENCES `profile` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
