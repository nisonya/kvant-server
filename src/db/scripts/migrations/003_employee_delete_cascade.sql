-- 003: обновление триггера employees_BEFORE_DELETE
-- Добавлены каскадные удаления из employees_schedule,
-- responsible_for_org_events, responsible_for_part_events

DROP TRIGGER IF EXISTS `employees_BEFORE_DELETE`;

DELIMITER ;;
CREATE TRIGGER `employees_BEFORE_DELETE` BEFORE DELETE ON `employees` FOR EACH ROW
BEGIN
  SET SQL_SAFE_UPDATES = 0;
  DELETE FROM `profile`                     WHERE `employee_id` = OLD.id_employees;
  DELETE FROM `employees_schedule`          WHERE `idEmployees` = OLD.id_employees;
  DELETE FROM `responsible_for_org_events`  WHERE `id_employee` = OLD.id_employees;
  DELETE FROM `responsible_for_part_events` WHERE `id_employee` = OLD.id_employees;
  SET SQL_SAFE_UPDATES = 1;
END;;
DELIMITER ;
