-- Удаление поля описания у таблицы должностей (position.discription)

ALTER TABLE `position` DROP COLUMN IF EXISTS `discription`;
