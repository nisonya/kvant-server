# Документация API Kvant Server

**Версия:** 1.4  
**Дата:** 2026-05-20  
**Протокол:** HTTPS

---

## Оглавление

1. [Общие сведения](#1-общие-сведения)
2. [Auth — Авторизация](#2-auth--авторизация)
3. [Desktop Updates — Обновления клиента](#3-desktop-updates--обновления-клиента)
4. [Employees — Сотрудники](#4-employees--сотрудники)
5. [Events (org) — Мероприятия организации](#5-events-org--мероприятия-организации)
6. [Events (part) — Мероприятия участия](#6-events-part--мероприятия-участия)
7. [Schedule — Расписание](#7-schedule--расписание)
8. [Reference — Справочники](#8-reference--справочники)
9. [Rent — Аренда помещений](#9-rent--аренда-помещений)
10. [Students — Студенты](#10-students--студенты)
11. [Attendance — Посещаемость](#11-attendance--посещаемость)
12. [Groups — Группы и пиксели](#12-groups--группы-и-пиксели)
13. [Коды HTTP-ответов](#13-коды-http-ответов)

---

## 1. Общие сведения

**Базовый URL:** `https://<host>:<port>`

| Успех | Ошибка |
|-------|--------|
| `{ success: true, data: ... } — для большинства эндпоинтов` | `{ success: false, error: "текст" }` |

**Content-Type:** application/json

**Авторизация:**

Эндпоинты /api/auth/login, /refresh, /logout — без токена. Остальные /api/* — с access-токеном: cookie access_token или заголовок Authorization: Bearer <token>. Refresh — cookie refresh_token или body refreshToken.

**Уровни доступа:**

Уровни доступа (access_level_id в profile): 1 — root, 2 — сотрудник, 3 — преподаватель, 4 — руководитель, 5 — методист, 6 — администратор. Операции «только админ» — уровни 1, 4, 6.

**Desktop updates:**

Маршруты /desktop-updates/* не требуют авторизации. Каталог задаётся DESKTOP_UPDATES_ROOT или DESKTOP_UPDATES_DIR, иначе <рабочая_директория>/desktop-updates.

---

## 2. Auth — Авторизация

**Базовый путь:** `/api/auth`  
**Токен:** не требуется

### Метод POST

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/auth/login` | Вход по логину и паролю | Body JSON: login (string), password (string) | Cookies: access_token, refresh_token. Body: { success: true, data: { user: { id, accessLevel } } } | Объект | — |
| `/api/auth/refresh` | Обновить access-токен по refresh | Cookie refresh_token или body: refreshToken (string) | { success: true, data: { ok: true } }, новый access_token в cookie | Объект | — |
| `/api/auth/logout` | Выход, очистка cookies | Cookie refresh_token (опционально отзыв в БД) | { success: true, data: { ok: true } } | Объект | — |
| `/api/auth/change-password` | Смена пароля текущего пользователя | Токен обязателен. Body: old_password, new_password (string, min 6) | 200: { success: true, data: { ok: true } }; 400 — нет полей/короткий пароль; 401 — нет токена; 403 — неверный old_password | Объект | Любой авторизованный пользователь |

---

## 3. Desktop Updates — Обновления клиента

**Базовый путь:** `/desktop-updates`  
**Токен:** не требуется

### Метод GET

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/desktop-updates/latest.yml` | Манифест electron-updater (текст YAML) | — | Файл latest.yml; в нём должны быть корректные имена .exe и .blockmap в каталоге | Файл | — |
| `/desktop-updates/:installerName.exe` | Скачать установщик Windows | installerName — имя файла из latest.yml (без .exe в параметре — суффикс добавляется маршрутом) | Бинарный поток application/octet-stream | Файл | — |
| `/desktop-updates/:installerName.exe.blockmap` | Blockmap для дельта-обновления | installerName — как в latest.yml | Бинарный поток | Файл | — |

---

## 4. Employees — Сотрудники

**Базовый путь:** `/api/employees`  
**Токен:** требуется

### Метод GET

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/employees` | Список активных с должностью | — | Массив: id_employees, first_name, second_name, patronymic, position, position_name | Массив | — |
| `/api/employees/all` | Полные поля активных сотрудников | — | Массив полей employees + position | Массив | — |
| `/api/employees/with-inactive` | Все сотрудники, включая неактивных | — | Массив с is_active | Массив | — |
| `/api/employees/schedule` | Расписание занятий (сотрудник–группа–комната) | — | Массив: id_employees, id_schedule, room_id, employee_name, day_name, startTime, endTime, room_name | Массив | — |
| `/api/employees/short-list` | Краткий список id и имя | — | Массив: { id, name } | Массив | — |
| `/api/employees/sizes` | id, имя, пол, размер | — | Массив: { id, name, gender, size } | Массив | — |
| `/api/employees/search` | Поиск по букве (query) | Query: letter | Массив: { id_employees, name } | Массив | — |
| `/api/employees/search/:letter` | Поиск по букве в пути | Path: letter | Массив: { id_employees, name } | Массив | — |
| `/api/employees/kpi/:id` | KPI сотрудника | Path: id | { KPI } | Объект | — |
| `/api/employees/:id` | Один сотрудник | Path: id | Полный объект с position_name, KPI, is_active и др. | Объект | — |

### Метод POST

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/employees` | Назначить сотрудника на мероприятие | event_id, employee_id (number) | { success, message } | Объект | — |
| `/api/employees/add` | Добавить сотрудника и профиль | first_name, second_name, patronymic, date_of_birth, position, login, password, access_level_id; опц.: contact, size, education, schedule, gender, KPI | { success, data: { id } } | Объект | 1, 4, 6 |

### Метод PUT

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/employees/kpi` | Установить KPI | id, KPI (string) | { success, data: { ok } } | Объект | — |
| `/api/employees/contact` | Обновить контакт | id, contact | { success, data: { ok } } | Объект | — |
| `/api/employees/size` | Обновить размер | id, size | { success, data: { ok } } | Объект | — |
| `/api/employees/:id` | Обновить данные сотрудника | Path: id + поля как при создании | { success, data: { ok } } | Объект | 1, 4, 6 |

### Метод DELETE

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/employees/:id` | Деактивировать/удалить сотрудника (каскад по связям) | Path: id | { success, data: { ok } } | Объект | 1, 4, 6 |

---

## 5. Events (org) — Мероприятия организации

**Базовый путь:** `/api/events/org`  
**Токен:** требуется

### Метод GET

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/events/org/resp-table` | Таблица ответственных | — | Массив responsible_for_org_events | Массив | — |
| `/api/events/org/full-inf/:id` | Полная информация о мероприятии | Path: id | Поля мероприятия + type (id types_of_organization), link | Объект | — |
| `/api/events/org/responsible/:id` | Ответственные по мероприятию | Path: id мероприятия | Массив: id_event, id_employees, first_name, second_name | Массив | — |
| `/api/events/org/notifications-today/:id` | Мероприятия сотрудника на сегодня | Path: id сотрудника | Массив: id, name, dates_of_event, day_of_the_week | Массив | — |
| `/api/events/org/notifications-tomorrow/:id` | Мероприятия сотрудника на завтра | Path: id сотрудника | Массив | Массив | — |
| `/api/events/org/:eventId/documents` | Список документов мероприятия | Path: eventId | Массив: id, id_event, storage_path, original_filename, mime_type, size_bytes, sort_order, created_at | Массив | — |
| `/api/events/org/documents/:documentId/download` | Скачать файл документа | Path: documentId | Файл (Content-Disposition) | Файл | — |

### Метод POST

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/events/org/list` | Список с фильтрами и пагинацией | filters: period или date_from/date_to; опц.: search, employee_id, type; sort; page, limit | { success, data: [...], page, limit } | Массив | — |
| `/api/events/org/count` | Количество по фильтрам | filters как у list | { success, total } | Объект | — |
| `/api/events/org` | Создать мероприятие | name, form_of_holding, dates_of_event, day_of_the_week, amount_of_applications, amount_of_planning_application, annotation, result; опц.: type, link | { success, id } | Объект | — |
| `/api/events/org/responsible` | Добавить ответственного | id_employee / id_employees, id_event | { success, data: { ok } } | Объект | — |
| `/api/events/org/:eventId/documents` | Загрузить документ | multipart: file (макс. 50 МБ); опц.: sort_order | { success, data: запись документа } | Объект | — |

### Метод PUT

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/events/org/notifications` | Мероприятия сотрудника на дату | id_employee, date (YYYY-MM-DD) | { success, data: массив } | Массив | — |
| `/api/events/org` | Обновить мероприятие | id + поля создания | { success, data: { ok } } | Объект | — |

### Метод PATCH

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/events/org/documents/:documentId` | Изменить sort_order документа | Body: sort_order (number) | { success, data: { ok } } | Объект | — |

### Метод DELETE

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/events/org/responsible` | Удалить связь ответственный–мероприятие | Body: id_employee, id_event | { success, data: { ok } } | Объект | — |
| `/api/events/org/:id` | Удалить мероприятие | Path: id | { success, data: { ok } } | Объект | — |
| `/api/events/org/documents/:documentId` | Удалить документ (файл + запись БД) | Path: documentId | { success, data: { ok } } | Объект | — |

---

## 6. Events (part) — Мероприятия участия

**Базовый путь:** `/api/events/part`  
**Токен:** требуется

### Метод GET

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/events/part/resp-table` | Таблица ответственных | — | Массив responsible_for_part_events | Массив | — |
| `/api/events/part/full-inf/:id` | Полная информация | Path: id | form_of_holding, id_type — id справочников; остальные поля мероприятия | Объект | — |
| `/api/events/part/responsible/:id` | Ответственные | Path: id | Массив + mark_of_sending_an_application | Массив | — |
| `/api/events/part/responsible-new/:id` | Ответственные + result_of_responsible | Path: id | Массив | Массив | — |
| `/api/events/part/notifications-today/:id` | Дедлайн регистрации сегодня | Path: id сотрудника | Массив | Массив | — |
| `/api/events/part/notifications-tomorrow/:id` | Дедлайн завтра | Path: id | Массив | Массив | — |
| `/api/events/part/:eventId/students` | Студенты мероприятия участия | Path: eventId | Массив студентов привязанных к мероприятию | Массив | — |
| `/api/events/part/:eventId/documents` | Список документов | Path: eventId | Как у org/documents | Массив | — |
| `/api/events/part/documents/:documentId/download` | Скачать документ | Path: documentId | Файл | Файл | — |

### Метод POST

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/events/part/list` | Список с фильтрами | filters по registration_deadline; search, employee_id, id_type; page, limit | { success, data, page, limit } | Массив | — |
| `/api/events/part/count` | Количество | filters как list | { success, total } | Объект | — |
| `/api/events/part` | Создать мероприятие | name, form_of_holding, id_type, registration_deadline, participants_and_works, annotation, dates_of_event, link, participants_amount, winner_amount, runner_up_amount, result (опц.) | { success, id } | Объект | — |
| `/api/events/part/responsible` | Добавить ответственного | id_employee / id_employees, id_event | { success, data: { ok } } | Объект | — |
| `/api/events/part/:eventId/students` | Добавить студента на мероприятие | Path: eventId; body: student_id и поля результата (см. контроллер) | { success, data: { id } } | Объект | — |
| `/api/events/part/:eventId/documents` | Загрузить документ | multipart file, макс. 50 МБ | Запись документа | Объект | — |

### Метод PUT

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/events/part/notifications` | Мероприятия с дедлайном на дату | id_employee, date | { success, data } | Массив | — |
| `/api/events/part` | Обновить мероприятие | id + поля | { success, data: { ok } } | Объект | — |
| `/api/events/part/result` | Результат ответственного | id_event, id_employee, result_of_responsible (опц.) | { success, data: { ok } } | Объект | — |
| `/api/events/part/mark` | Отметка отправки заявки | id_event, id_employee, mark_of_sending_an_application (0\|1) | { success, data: { ok } } | Объект | — |
| `/api/events/part/students/:id` | Обновить запись студента на мероприятии | Path: id записи event_part_students + поля | { success, data: { ok } } | Объект | — |

### Метод PATCH

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/events/part/documents/:documentId` | sort_order документа | sort_order | { success, data: { ok } } | Объект | — |

### Метод DELETE

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/events/part/responsible` | Удалить ответственного | id_employee, id_event | { success, data: { ok } } | Объект | — |
| `/api/events/part/:id` | Удалить мероприятие | Path: id | { success, data: { ok } } | Объект | — |
| `/api/events/part/students/:id` | Удалить студента с мероприятия | Path: id записи | { success, data: { ok } } | Объект | — |
| `/api/events/part/documents/:documentId` | Удалить документ | Path: documentId | { success, data: { ok } } | Объект | — |

---

## 7. Schedule — Расписание

**Базовый путь:** `/api/schedule`  
**Токен:** требуется

### Метод GET

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/schedule` | Полное расписание | — | id, room, group, startTime, endTime, day, id_employees | Массив | — |
| `/api/schedule/teachers` | Список преподавателей | — | { id, name } | Массив | — |
| `/api/schedule/groups` | Список групп | — | { id, name } | Массив | — |
| `/api/schedule/by-teacher/:id` | По преподавателю | Path: id | Массив занятий | Массив | — |
| `/api/schedule/by-group/:id` | По группе | Path: id | Массив | Массив | — |
| `/api/schedule/by-room/:id` | По комнате | Path: id | Массив | Массив | — |

### Метод POST

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/schedule/by-date` | Занятия по дате и комнате | date (YYYY-MM-DD), room_id | { success, data } | Массив | — |
| `/api/schedule` | Добавить занятие | room_id, group_id, start_time, end_time, day (1–7), employee_id | { success, data: { id } } | Объект | — |

### Метод PUT

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/schedule` | Обновить занятие | id, room_id, group_id, start_time, end_time | { success, data: { ok } } | Объект | — |

### Метод DELETE

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/schedule/:id` | Удалить занятие | Path: id | { success, data: { ok } } | Объект | — |

---

## 8. Reference — Справочники

**Базовый путь:** `/api/reference`  
**Токен:** требуется

### Метод GET

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/reference/rooms` | Список комнат | — | { id, name } | Массив | — |
| `/api/reference/access` | Все уровни доступа | — | { id, name } | Массив | — |
| `/api/reference/access/:employeeId` | Уровень доступа сотрудника | Path: employeeId | Объект access | Объект | — |
| `/api/reference/positions` | Должности | — | { id, name } | Массив | — |
| `/api/reference/docs` | Типы документов | — | Массив documents | Массив | — |
| `/api/reference/types-of-holding` | Форматы проведения | — | Массив form_of_holding | Массив | — |
| `/api/reference/types-of-organization` | Типы мероприятий организации | — | { id, name } | Массив | — |
| `/api/reference/levels` | Уровни мероприятий участия | — | { id, name } | Массив | — |
| `/api/reference/student-statuses` | Статусы студентов | — | Массив справочника | Массив | — |

### Метод POST

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/reference/rooms` | Добавить комнату | name (string) | { success, data: { id } } | Объект | 1, 4, 6 |
| `/api/reference/positions` | Добавить должность | name | { success, data: { id } } | Объект | 1, 4, 6 |
| `/api/reference/docs` | Добавить тип документа | поля documents | { success, data: { id } } | Объект | 1, 4, 6 |

### Метод PUT

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/reference/rooms/:id` | Обновить комнату | Path: id; body: name | { success, data: { ok } } | Объект | 1, 4, 6 |
| `/api/reference/positions/:id` | Обновить должность | Path: id; name | { success, data: { ok } } | Объект | 1, 4, 6 |
| `/api/reference/docs/:id` | Обновить тип документа | Path: id + поля | { success, data: { ok } } | Объект | 1, 4, 6 |

### Метод DELETE

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/reference/rooms/:id` | Удалить комнату | Path: id | { success, data: { ok } } | Объект | 1, 4, 6 |
| `/api/reference/positions/:id` | Удалить должность | Path: id | { success, data: { ok } } | Объект | 1, 4, 6 |
| `/api/reference/docs/:id` | Удалить тип документа | Path: id | { success, data: { ok } } | Объект | 1, 4, 6 |

---

## 9. Rent — Аренда помещений

**Базовый путь:** `/api/rent`  
**Токен:** требуется

### Метод GET

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/rent/by-event/:id` | Аренды по мероприятию | Path: id мероприятия | Массив | Массив | — |
| `/api/rent/by-id/:id` | Одна запись | Path: id | event_id, room_id, date, start_time, end_time | Объект | — |

### Метод POST

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/rent/by-date-room` | Аренды на дату и комнату | date, room_id | { success, data } | Массив | — |
| `/api/rent` | Создать аренду | event_id, room_id, date, start_time, end_time | { success, data: { id } } | Объект | — |

### Метод PUT

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/rent` | Обновить | id, event_id, room_id, date, start_time, end_time | { success, data: { ok } } | Объект | — |

### Метод DELETE

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/rent/:id` | Удалить | Path: id | { success, data: { ok } } | Объект | — |

---

## 10. Students — Студенты

**Базовый путь:** `/api/students`  
**Токен:** требуется

### Метод GET

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/students/search` | Поиск по фамилии | Query: letter | Массив | Массив | — |
| `/api/students/search/:letter` | Поиск, буква в пути | Path: letter | Массив | Массив | — |
| `/api/students/search-new` | Поиск с isActive и числом групп | — | Массив | Массив | — |
| `/api/students/search-new/:letter` | Поиск-new с letter | Path: letter | Массив | Массив | — |
| `/api/students/groups-by-student/:id` | Группы студента | Path: id | Массив | Массив | — |
| `/api/students/by-group/:id` | Краткий список группы | Path: id группы | { id, name } | Массив | — |
| `/api/students/full-by-group/:id` | Полные данные студентов группы | Path: id | Массив всех полей | Массив | — |
| `/api/students/:id` | Один студент | Path: id | Объект студента | Объект | — |

### Метод POST

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/students/add-to-group` | Добавить в группу | student_id, group_id | { success, data: { ok } } | Объект | — |
| `/api/students` | Создать студента | surname, name, patronymic, birthDay, parentSurname, parentName, parentPatronymic, email, phone; опц.: navigator | { success, data: { id } } | Объект | — |

### Метод PUT

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/students/exist` | Проверить существование по ФИО | surname, name, patronymic | { success, data: { amount } } | Объект | — |
| `/api/students` | Обновить студента | id + поля создания | { success, data: { ok } } | Объект | — |
| `/api/students/update-to-group` | Перевод между группами | student_id, old_group_id, new_group_id | { success, data: { ok } } | Объект | — |

### Метод DELETE

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/students/from-group` | Убрать из группы (посещаемость не удаляется) | Body: student_id, group_id | { success, data: { ok } } | Объект | — |

---

## 11. Attendance — Посещаемость

**Базовый путь:** `/api/attendance`  
**Токен:** требуется

### Метод GET

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/attendance/by-group/:id` | Посещаемость по группе | Path: id группы | name, date_of_lesson, presence | Массив | — |

### Метод POST

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/attendance` | Создать/обновить запись (upsert) | student_id, group_id, date_of_lesson (YYYY-MM-DD), presence (0/1) | { success, data: { ok } } | Объект | — |
| `/api/attendance/clear-all` | Полная очистка таблицы attendance | — | { success: true, message, affectedRows } — не обёртка data | Объект | 1, 4, 6 |

### Метод PUT

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/attendance/by-group-date` | По группе и дате | group_id, date | { success, data } | Массив | — |
| `/api/attendance/by-group-date-new` | По группе и дате с id_student | group_id, date | data + id_student | Массив | — |

---

## 12. Groups — Группы и пиксели

**Базовый путь:** `/api/groups`  
**Токен:** требуется

### Метод GET

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/groups/by-teacher/:id` | Группы преподавателя | Path: id | Массив | Массив | — |
| `/api/groups/table` | Таблица students_groups | — | Все связи | Массив | — |
| `/api/groups/pixels/:id` | Пиксели студентов группы | Path: id группы | name + поля pixels | Массив | — |
| `/api/groups/list` | Список групп | — | { id, name } | Массив | — |

### Метод POST

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/groups/list` | Создать группу | name | { success, data: { id } } | Объект | 1, 4, 6 |
| `/api/groups/pixels/clear-all` | Обнулить все столбцы пикселей у всех студентов | — | { success, message, affectedRows } | Объект | 1, 4, 6 |

### Метод PUT

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/groups/pixels` | Обновить пиксели студента | id_student; поля: part_of_comp, make_content, invite_friend, clean_kvantum, filled_project_card_on_time, finished_project_with_product, regional_competition, interregional_competition, all_russian_competition, international_competition, nto, become_an_engineering_volunteer, help_with_event, make_own_event, special_achievements, fine | { success, data: { ok, affected } } | Объект | — |
| `/api/groups/list/:id` | Переименовать группу | Path: id; name | { success, data: { ok } } | Объект | 1, 4, 6 |

### Метод DELETE

| Путь | Описание | Запрос | Ответ | Тип | Права |
|------|----------|--------|-------|-----|-------|
| `/api/groups/list/:id` | Удалить группу | Path: id | { success, data: { ok } } | Объект | 1, 4, 6 |

---

## 13. Коды HTTP-ответов

| Код | Описание |
|-----|----------|
| 200 | Успех |
| 201 | Создано |
| 400 | Неверный запрос (валидация, отсутствуют поля) |
| 401 | Не авторизован (нет или просрочен access-токен) |
| 403 | Доступ запрещён (недостаточно прав или неверный старый пароль) |
| 404 | Не найдено |
| 409 | Конфликт (дубликат, занятая запись) |
| 500 | Ошибка сервера |
| 503 | Сервис недоступен (например, не настроен каталог документов) |

---

*Сгенерировано командой `npm run doc:api`. Источник данных: `scripts/api-documentation-data.js`.*
