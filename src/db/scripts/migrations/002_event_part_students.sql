-- Миграция: таблицы для учеников мероприятий участия.
-- Перед применением сделайте резервную копию.

-- 1) Справочник статусов
CREATE TABLE IF NOT EXISTS `event_part_student_status` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO `event_part_student_status` (`id`, `name`) VALUES
  (1, 'Участник'),
  (2, 'Победитель'),
  (3, 'Призёр');

-- 2) Связь мероприятие – ученик – статус
CREATE TABLE IF NOT EXISTS `event_part_student` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_event` int unsigned NOT NULL,
  `id_student` int unsigned NOT NULL,
  `id_status` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_event_student` (`id_event`, `id_student`),
  KEY `fk_eps_student` (`id_student`),
  KEY `fk_eps_status` (`id_status`),
  CONSTRAINT `fk_eps_event` FOREIGN KEY (`id_event`) REFERENCES `event_plan_participation` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_eps_student` FOREIGN KEY (`id_student`) REFERENCES `students` (`idStudent`) ON DELETE CASCADE,
  CONSTRAINT `fk_eps_status` FOREIGN KEY (`id_status`) REFERENCES `event_part_student_status` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
