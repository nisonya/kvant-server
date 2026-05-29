/**
 * Полное описание API Kvant Server для генерации документации (DOCX / PDF).
 * Синхронизировано с маршрутами в src/api/modules.
 */

const DOC_VERSION = '1.4.1';
const DOC_DATE = '2026-05-28';

const GENERAL = {
  baseUrl: 'https://<host>:<port>',
  protocol: 'HTTPS',
  contentType: 'application/json',
  successFormat: '{ success: true, data: ... } — для большинства эндпоинтов',
  errorFormat: '{ success: false, error: "текст" }',
  auth:
    'Эндпоинты /api/auth/login, /refresh, /logout — без токена. Остальные /api/* — с access-токеном: cookie access_token или заголовок Authorization: Bearer <token>. Refresh — cookie refresh_token или body refreshToken.',
  accessLevels:
    'Уровни доступа (access_level_id в profile): 1 — root, 2 — сотрудник, 3 — преподаватель, 4 — руководитель, 5 — методист, 6 — администратор. Операции «только админ» — уровни 1, 4, 6.',
  desktopUpdates:
    'Маршруты /desktop-updates/* не требуют авторизации. Каталог задаётся DESKTOP_UPDATES_ROOT или DESKTOP_UPDATES_DIR, иначе <рабочая_директория>/desktop-updates.',
};

const ERROR_CODES = [
  ['200', 'Успех'],
  ['201', 'Создано'],
  ['400', 'Неверный запрос (валидация, отсутствуют поля)'],
  ['401', 'Не авторизован (нет или просрочен access-токен)'],
  ['403', 'Доступ запрещён (недостаточно прав или неверный старый пароль)'],
  ['404', 'Не найдено'],
  ['409', 'Конфликт (дубликат, занятая запись)'],
  ['500', 'Ошибка сервера'],
  ['503', 'Сервис недоступен (например, не настроен каталог документов)'],
];

/** @type {Record<string, { name: string, basePath: string, tokenRequired: boolean, endpoints: Record<string, Array<{ path: string, description: string, request: string, response: string, type: string, roles?: string }>> }>} */
const API_DATA = {
  auth: {
    name: 'Auth — Авторизация',
    basePath: '/api/auth',
    tokenRequired: false,
    endpoints: {
      POST: [
        {
          path: '/api/auth/login',
          description: 'Вход по логину и паролю',
          request: 'Body JSON: login (string), password (string)',
          response: 'Cookies: access_token, refresh_token. Body: { success: true, data: { user: { id, accessLevel } } }',
          type: 'object',
        },
        {
          path: '/api/auth/refresh',
          description: 'Обновить access-токен по refresh',
          request: 'Cookie refresh_token или body: refreshToken (string)',
          response: '{ success: true, data: { ok: true } }, новый access_token в cookie',
          type: 'object',
        },
        {
          path: '/api/auth/logout',
          description: 'Выход, очистка cookies',
          request: 'Cookie refresh_token (опционально отзыв в БД)',
          response: '{ success: true, data: { ok: true } }',
          type: 'object',
        },
        {
          path: '/api/auth/change-password',
          description: 'Смена пароля текущего пользователя',
          request: 'Токен обязателен. Body: old_password, new_password (string, min 6)',
          response: '200: { success: true, data: { ok: true } }; 400 — нет полей/короткий пароль; 401 — нет токена; 403 — неверный old_password',
          type: 'object',
          roles: 'Любой авторизованный пользователь',
        },
      ],
    },
  },
  desktopUpdates: {
    name: 'Desktop Updates — Обновления клиента',
    basePath: '/desktop-updates',
    tokenRequired: false,
    endpoints: {
      GET: [
        {
          path: '/desktop-updates/latest.yml',
          description: 'Манифест electron-updater (текст YAML)',
          request: '—',
          response: 'Файл latest.yml; в нём должны быть корректные имена .exe и .blockmap в каталоге',
          type: 'file',
        },
        {
          path: '/desktop-updates/:installerName.exe',
          description: 'Скачать установщик Windows',
          request: 'installerName — имя файла из latest.yml (без .exe в параметре — суффикс добавляется маршрутом)',
          response: 'Бинарный поток application/octet-stream',
          type: 'file',
        },
        {
          path: '/desktop-updates/:installerName.exe.blockmap',
          description: 'Blockmap для дельта-обновления',
          request: 'installerName — как в latest.yml',
          response: 'Бинарный поток',
          type: 'file',
        },
      ],
    },
  },
  employees: {
    name: 'Employees — Сотрудники',
    basePath: '/api/employees',
    tokenRequired: true,
    endpoints: {
      GET: [
        { path: '/api/employees', description: 'Список активных с должностью', request: '—', response: 'Массив: id_employees, first_name, second_name, patronymic, position, position_name', type: 'array' },
        { path: '/api/employees/all', description: 'Полные поля активных сотрудников', request: '—', response: 'Массив полей employees + position', type: 'array' },
        { path: '/api/employees/with-inactive', description: 'Все сотрудники, включая неактивных', request: '—', response: 'Массив с is_active', type: 'array' },
        { path: '/api/employees/schedule', description: 'Расписание занятий (сотрудник–группа–комната)', request: '—', response: 'Массив: id_employees, id_schedule, room_id, employee_name, day_name, startTime, endTime, room_name', type: 'array' },
        { path: '/api/employees/short-list', description: 'Краткий список id и имя', request: '—', response: 'Массив: { id, name }', type: 'array' },
        { path: '/api/employees/sizes', description: 'id, имя, пол, размер', request: '—', response: 'Массив: { id, name, gender, size }', type: 'array' },
        { path: '/api/employees/search', description: 'Поиск по букве (query)', request: 'Query: letter', response: 'Массив: { id_employees, name }', type: 'array' },
        { path: '/api/employees/search/:letter', description: 'Поиск по букве в пути', request: 'Path: letter', response: 'Массив: { id_employees, name }', type: 'array' },
        { path: '/api/employees/kpi/:id', description: 'KPI сотрудника', request: 'Path: id', response: '{ KPI }', type: 'object' },
        { path: '/api/employees/:id', description: 'Один сотрудник', request: 'Path: id', response: 'Полный объект с position_name, KPI, is_active и др.', type: 'object' },
      ],
      POST: [
        { path: '/api/employees', description: 'Назначить сотрудника на мероприятие', request: 'event_id, employee_id (number)', response: '{ success, message }', type: 'object' },
        { path: '/api/employees/add', description: 'Добавить сотрудника и профиль', request: 'first_name, second_name, patronymic, date_of_birth, position, login, password, access_level_id; опц.: contact, size, education, schedule, gender, KPI', response: '{ success, data: { id } }', type: 'object', roles: '1, 4, 6' },
      ],
      PUT: [
        { path: '/api/employees/kpi', description: 'Установить KPI', request: 'id, KPI (string)', response: '{ success, data: { ok } }', type: 'object' },
        { path: '/api/employees/contact', description: 'Обновить контакт', request: 'id, contact', response: '{ success, data: { ok } }', type: 'object' },
        { path: '/api/employees/size', description: 'Обновить размер', request: 'id, size', response: '{ success, data: { ok } }', type: 'object' },
        { path: '/api/employees/:id', description: 'Обновить данные сотрудника', request: 'Path: id + поля как при создании', response: '{ success, data: { ok } }', type: 'object', roles: '1, 4, 6' },
      ],
      DELETE: [
        { path: '/api/employees/:id', description: 'Деактивировать/удалить сотрудника (каскад по связям)', request: 'Path: id', response: '{ success, data: { ok } }', type: 'object', roles: '1, 4, 6' },
      ],
    },
  },
  eventsOrg: {
    name: 'Events (org) — Мероприятия организации',
    basePath: '/api/events/org',
    tokenRequired: true,
    endpoints: {
      GET: [
        { path: '/api/events/org/resp-table', description: 'Таблица ответственных', request: '—', response: 'Массив responsible_for_org_events', type: 'array' },
        { path: '/api/events/org/full-inf/:id', description: 'Полная информация о мероприятии', request: 'Path: id', response: 'Поля мероприятия + type (id types_of_organization), link', type: 'object' },
        { path: '/api/events/org/responsible/:id', description: 'Ответственные по мероприятию', request: 'Path: id мероприятия', response: 'Массив: id_event, id_employees, first_name, second_name', type: 'array' },
        { path: '/api/events/org/notifications-today/:id', description: 'Мероприятия сотрудника на сегодня', request: 'Path: id сотрудника', response: 'Массив: id, name, dates_of_event, day_of_the_week', type: 'array' },
        { path: '/api/events/org/notifications-tomorrow/:id', description: 'Мероприятия сотрудника на завтра', request: 'Path: id сотрудника', response: 'Массив', type: 'array' },
        { path: '/api/events/org/:eventId/documents', description: 'Список документов мероприятия', request: 'Path: eventId', response: 'Массив: id, id_event, storage_path, original_filename, mime_type, size_bytes, sort_order, created_at', type: 'array' },
        { path: '/api/events/org/documents/:documentId/download', description: 'Скачать файл документа', request: 'Path: documentId', response: 'Файл (Content-Disposition)', type: 'file' },
      ],
      POST: [
        { path: '/api/events/org/list', description: 'Список с фильтрами и пагинацией', request: 'filters: period или date_from/date_to; опц.: search, employee_id, type; sort; page, limit', response: '{ success, data: [...], page, limit }', type: 'array' },
        { path: '/api/events/org/count', description: 'Количество по фильтрам', request: 'filters как у list', response: '{ success, total }', type: 'object' },
        { path: '/api/events/org', description: 'Создать мероприятие', request: 'name, form_of_holding, dates_of_event, day_of_the_week, amount_of_applications, amount_of_planning_application, annotation, result; опц.: type, link', response: '{ success, id }', type: 'object' },
        { path: '/api/events/org/responsible', description: 'Добавить ответственного', request: 'id_employee / id_employees, id_event', response: '{ success, data: { ok } }', type: 'object' },
        { path: '/api/events/org/:eventId/documents', description: 'Загрузить документ', request: 'multipart: file (макс. 50 МБ); опц.: sort_order', response: '{ success, data: запись документа }', type: 'object' },
      ],
      PUT: [
        { path: '/api/events/org/notifications', description: 'Мероприятия сотрудника на дату', request: 'id_employee, date (YYYY-MM-DD)', response: '{ success, data: массив }', type: 'array' },
        { path: '/api/events/org', description: 'Обновить мероприятие', request: 'id + поля создания', response: '{ success, data: { ok } }', type: 'object' },
      ],
      PATCH: [
        { path: '/api/events/org/documents/:documentId', description: 'Изменить sort_order документа', request: 'Body: sort_order (number)', response: '{ success, data: { ok } }', type: 'object' },
      ],
      DELETE: [
        { path: '/api/events/org/responsible', description: 'Удалить связь ответственный–мероприятие', request: 'Body: id_employee, id_event', response: '{ success, data: { ok } }', type: 'object' },
        { path: '/api/events/org/:id', description: 'Удалить мероприятие', request: 'Path: id', response: '{ success, data: { ok } }', type: 'object' },
        { path: '/api/events/org/documents/:documentId', description: 'Удалить документ (файл + запись БД)', request: 'Path: documentId', response: '{ success, data: { ok } }', type: 'object' },
      ],
    },
  },
  eventsPart: {
    name: 'Events (part) — Мероприятия участия',
    basePath: '/api/events/part',
    tokenRequired: true,
    endpoints: {
      GET: [
        { path: '/api/events/part/resp-table', description: 'Таблица ответственных', request: '—', response: 'Массив responsible_for_part_events', type: 'array' },
        { path: '/api/events/part/full-inf/:id', description: 'Полная информация', request: 'Path: id', response: 'form_of_holding, id_type — id справочников; остальные поля мероприятия', type: 'object' },
        { path: '/api/events/part/responsible/:id', description: 'Ответственные', request: 'Path: id', response: 'Массив + mark_of_sending_an_application', type: 'array' },
        { path: '/api/events/part/responsible-new/:id', description: 'Ответственные + result_of_responsible', request: 'Path: id', response: 'Массив', type: 'array' },
        { path: '/api/events/part/notifications-today/:id', description: 'Дедлайн регистрации сегодня', request: 'Path: id сотрудника', response: 'Массив', type: 'array' },
        { path: '/api/events/part/notifications-tomorrow/:id', description: 'Дедлайн завтра', request: 'Path: id', response: 'Массив', type: 'array' },
        { path: '/api/events/part/:eventId/students', description: 'Студенты мероприятия участия', request: 'Path: eventId', response: 'Массив студентов привязанных к мероприятию', type: 'array' },
        { path: '/api/events/part/:eventId/documents', description: 'Список документов', request: 'Path: eventId', response: 'Как у org/documents', type: 'array' },
        { path: '/api/events/part/documents/:documentId/download', description: 'Скачать документ', request: 'Path: documentId', response: 'Файл', type: 'file' },
      ],
      POST: [
        { path: '/api/events/part/list', description: 'Список с фильтрами', request: 'filters по registration_deadline; search, employee_id, id_type; page, limit', response: '{ success, data, page, limit }', type: 'array' },
        { path: '/api/events/part/count', description: 'Количество', request: 'filters как list', response: '{ success, total }', type: 'object' },
        { path: '/api/events/part', description: 'Создать мероприятие', request: 'name, form_of_holding, id_type, registration_deadline, participants_and_works, annotation, dates_of_event, link, participants_amount, winner_amount, runner_up_amount, result (опц.)', response: '{ success, id }', type: 'object' },
        { path: '/api/events/part/responsible', description: 'Добавить ответственного', request: 'id_employee / id_employees, id_event', response: '{ success, data: { ok } }', type: 'object' },
        { path: '/api/events/part/:eventId/students', description: 'Добавить студента на мероприятие', request: 'Path: eventId; body: student_id и поля результата (см. контроллер)', response: '{ success, data: { id } }', type: 'object' },
        { path: '/api/events/part/:eventId/documents', description: 'Загрузить документ', request: 'multipart file, макс. 50 МБ', response: 'Запись документа', type: 'object' },
      ],
      PUT: [
        { path: '/api/events/part/notifications', description: 'Мероприятия с дедлайном на дату', request: 'id_employee, date', response: '{ success, data }', type: 'array' },
        { path: '/api/events/part', description: 'Обновить мероприятие', request: 'id + поля', response: '{ success, data: { ok } }', type: 'object' },
        { path: '/api/events/part/result', description: 'Результат ответственного', request: 'id_event, id_employee, result_of_responsible (опц.)', response: '{ success, data: { ok } }', type: 'object' },
        { path: '/api/events/part/mark', description: 'Отметка отправки заявки', request: 'id_event, id_employee, mark_of_sending_an_application (0|1)', response: '{ success, data: { ok } }', type: 'object' },
        { path: '/api/events/part/students/:id', description: 'Обновить запись студента на мероприятии', request: 'Path: id записи event_part_students + поля', response: '{ success, data: { ok } }', type: 'object' },
      ],
      PATCH: [
        { path: '/api/events/part/documents/:documentId', description: 'sort_order документа', request: 'sort_order', response: '{ success, data: { ok } }', type: 'object' },
      ],
      DELETE: [
        { path: '/api/events/part/responsible', description: 'Удалить ответственного', request: 'id_employee, id_event', response: '{ success, data: { ok } }', type: 'object' },
        { path: '/api/events/part/:id', description: 'Удалить мероприятие', request: 'Path: id', response: '{ success, data: { ok } }', type: 'object' },
        { path: '/api/events/part/students/:id', description: 'Удалить студента с мероприятия', request: 'Path: id записи', response: '{ success, data: { ok } }', type: 'object' },
        { path: '/api/events/part/documents/:documentId', description: 'Удалить документ', request: 'Path: documentId', response: '{ success, data: { ok } }', type: 'object' },
      ],
    },
  },
  schedule: {
    name: 'Schedule — Расписание',
    basePath: '/api/schedule',
    tokenRequired: true,
    endpoints: {
      GET: [
        { path: '/api/schedule', description: 'Полное расписание', request: '—', response: 'id, room, group, startTime, endTime, day, id_employees', type: 'array' },
        { path: '/api/schedule/teachers', description: 'Список преподавателей', request: '—', response: '{ id, name }', type: 'array' },
        { path: '/api/schedule/groups', description: 'Список групп', request: '—', response: '{ id, name }', type: 'array' },
        { path: '/api/schedule/by-teacher/:id', description: 'По преподавателю', request: 'Path: id', response: 'Массив занятий с id занятия (idlesson → id)', type: 'array' },
        { path: '/api/schedule/by-group/:id', description: 'По группе', request: 'Path: id', response: 'Массив занятий с id занятия (idlesson → id)', type: 'array' },
        { path: '/api/schedule/by-room/:id', description: 'По комнате', request: 'Path: id', response: 'Массив занятий с id занятия (idlesson → id)', type: 'array' },
      ],
      POST: [
        { path: '/api/schedule/by-date', description: 'Занятия по дате и комнате', request: 'date (YYYY-MM-DD), room_id', response: '{ success, data } где каждый элемент содержит id занятия (id)', type: 'array' },
        { path: '/api/schedule', description: 'Добавить занятие', request: 'room_id, group_id, start_time, end_time, day (1–7), employee_id', response: '{ success, data: { id } }', type: 'object' },
      ],
      PUT: [
        { path: '/api/schedule', description: 'Обновить занятие', request: 'id, room_id, group_id, start_time, end_time', response: '{ success, data: { ok } }', type: 'object' },
      ],
      DELETE: [
        { path: '/api/schedule/:id', description: 'Удалить занятие', request: 'Path: id', response: '{ success, data: { ok } }', type: 'object' },
        { path: '/api/schedule', description: 'Удалить занятие (альтернативно)', request: 'Body: id или id_schedule', response: '{ success, data: { ok } }', type: 'object' },
      ],
    },
  },
  reference: {
    name: 'Reference — Справочники',
    basePath: '/api/reference',
    tokenRequired: true,
    endpoints: {
      GET: [
        { path: '/api/reference/rooms', description: 'Список комнат', request: '—', response: '{ id, name }', type: 'array' },
        { path: '/api/reference/access', description: 'Все уровни доступа', request: '—', response: '{ id, name }', type: 'array' },
        { path: '/api/reference/access/:employeeId', description: 'Уровень доступа сотрудника', request: 'Path: employeeId', response: 'Объект access', type: 'object' },
        { path: '/api/reference/positions', description: 'Должности', request: '—', response: '{ id, name }', type: 'array' },
        { path: '/api/reference/docs', description: 'Типы документов', request: '—', response: 'Массив documents', type: 'array' },
        { path: '/api/reference/types-of-holding', description: 'Форматы проведения', request: '—', response: 'Массив form_of_holding', type: 'array' },
        { path: '/api/reference/types-of-organization', description: 'Типы мероприятий организации', request: '—', response: '{ id, name }', type: 'array' },
        { path: '/api/reference/levels', description: 'Уровни мероприятий участия', request: '—', response: '{ id, name }', type: 'array' },
        { path: '/api/reference/student-statuses', description: 'Статусы студентов', request: '—', response: 'Массив справочника', type: 'array' },
      ],
      POST: [
        { path: '/api/reference/rooms', description: 'Добавить комнату', request: 'name (string)', response: '{ success, data: { id } }', type: 'object', roles: '1, 4, 6' },
        { path: '/api/reference/positions', description: 'Добавить должность', request: 'name', response: '{ success, data: { id } }', type: 'object', roles: '1, 4, 6' },
        { path: '/api/reference/docs', description: 'Добавить тип документа', request: 'поля documents', response: '{ success, data: { id } }', type: 'object', roles: '1, 4, 6' },
      ],
      PUT: [
        { path: '/api/reference/rooms/:id', description: 'Обновить комнату', request: 'Path: id; body: name', response: '{ success, data: { ok } }', type: 'object', roles: '1, 4, 6' },
        { path: '/api/reference/positions/:id', description: 'Обновить должность', request: 'Path: id; name', response: '{ success, data: { ok } }', type: 'object', roles: '1, 4, 6' },
        { path: '/api/reference/docs/:id', description: 'Обновить тип документа', request: 'Path: id + поля', response: '{ success, data: { ok } }', type: 'object', roles: '1, 4, 6' },
      ],
      DELETE: [
        { path: '/api/reference/rooms/:id', description: 'Удалить комнату', request: 'Path: id', response: '{ success, data: { ok } }', type: 'object', roles: '1, 4, 6' },
        { path: '/api/reference/positions/:id', description: 'Удалить должность', request: 'Path: id', response: '{ success, data: { ok } }', type: 'object', roles: '1, 4, 6' },
        { path: '/api/reference/docs/:id', description: 'Удалить тип документа', request: 'Path: id', response: '{ success, data: { ok } }', type: 'object', roles: '1, 4, 6' },
      ],
    },
  },
  rent: {
    name: 'Rent — Аренда помещений',
    basePath: '/api/rent',
    tokenRequired: true,
    endpoints: {
      GET: [
        { path: '/api/rent/by-event/:id', description: 'Аренды по мероприятию', request: 'Path: id мероприятия', response: 'Массив', type: 'array' },
        { path: '/api/rent/by-id/:id', description: 'Одна запись', request: 'Path: id', response: 'event_id, room_id, date, start_time, end_time', type: 'object' },
      ],
      POST: [
        { path: '/api/rent/by-date-room', description: 'Аренды на дату и комнату', request: 'date, room_id', response: '{ success, data }', type: 'array' },
        { path: '/api/rent', description: 'Создать аренду', request: 'event_id, room_id, date, start_time, end_time', response: '{ success, data: { id } }', type: 'object' },
      ],
      PUT: [
        { path: '/api/rent', description: 'Обновить', request: 'id, event_id, room_id, date, start_time, end_time', response: '{ success, data: { ok } }', type: 'object' },
      ],
      DELETE: [
        { path: '/api/rent/:id', description: 'Удалить', request: 'Path: id', response: '{ success, data: { ok } }', type: 'object' },
      ],
    },
  },
  students: {
    name: 'Students — Студенты',
    basePath: '/api/students',
    tokenRequired: true,
    endpoints: {
      GET: [
        { path: '/api/students/search', description: 'Поиск по фамилии', request: 'Query: letter', response: 'Массив', type: 'array' },
        { path: '/api/students/search/:letter', description: 'Поиск, буква в пути', request: 'Path: letter', response: 'Массив', type: 'array' },
        { path: '/api/students/search-new', description: 'Поиск с isActive и числом групп', request: '—', response: 'Массив', type: 'array' },
        { path: '/api/students/search-new/:letter', description: 'Поиск-new с letter', request: 'Path: letter', response: 'Массив', type: 'array' },
        { path: '/api/students/groups-by-student/:id', description: 'Группы студента', request: 'Path: id', response: 'Массив', type: 'array' },
        { path: '/api/students/by-group/:id', description: 'Краткий список группы', request: 'Path: id группы', response: '{ id, name }', type: 'array' },
        { path: '/api/students/full-by-group/:id', description: 'Полные данные студентов группы', request: 'Path: id', response: 'Массив всех полей', type: 'array' },
        { path: '/api/students/:id', description: 'Один студент', request: 'Path: id', response: 'Объект студента', type: 'object' },
      ],
      POST: [
        { path: '/api/students/add-to-group', description: 'Добавить в группу', request: 'student_id, group_id', response: '{ success, data: { ok } }', type: 'object' },
        { path: '/api/students', description: 'Создать студента', request: 'surname, name, patronymic, birthDay, parentSurname, parentName, parentPatronymic, email, phone; опц.: navigator', response: '{ success, data: { id } }', type: 'object' },
      ],
      PUT: [
        { path: '/api/students/exist', description: 'Проверить существование по ФИО', request: 'surname, name, patronymic', response: '{ success, data: { amount } }', type: 'object' },
        { path: '/api/students', description: 'Обновить студента', request: 'id + поля создания', response: '{ success, data: { ok } }', type: 'object' },
        { path: '/api/students/update-to-group', description: 'Перевод между группами', request: 'student_id, old_group_id, new_group_id', response: '{ success, data: { ok } }', type: 'object' },
      ],
      DELETE: [
        { path: '/api/students/from-group', description: 'Убрать из группы (посещаемость не удаляется)', request: 'Body: student_id, group_id', response: '{ success, data: { ok } }', type: 'object' },
      ],
    },
  },
  attendance: {
    name: 'Attendance — Посещаемость',
    basePath: '/api/attendance',
    tokenRequired: true,
    endpoints: {
      GET: [
        { path: '/api/attendance/by-group/:id', description: 'Посещаемость по группе', request: 'Path: id группы', response: 'name, date_of_lesson, presence', type: 'array' },
      ],
      PUT: [
        { path: '/api/attendance/by-group-date', description: 'По группе и дате', request: 'group_id, date', response: '{ success, data }', type: 'array' },
        { path: '/api/attendance/by-group-date-new', description: 'По группе и дате с id_student', request: 'group_id, date', response: 'data + id_student', type: 'array' },
      ],
      POST: [
        { path: '/api/attendance', description: 'Создать/обновить запись (upsert)', request: 'student_id, group_id, date_of_lesson (YYYY-MM-DD), presence (0/1)', response: '{ success, data: { ok } }', type: 'object' },
        {
          path: '/api/attendance/clear-all',
          description: 'Полная очистка таблицы attendance',
          request: '—',
          response: '{ success: true, message, affectedRows } — не обёртка data',
          type: 'object',
          roles: '1, 4, 6',
        },
      ],
    },
  },
  groups: {
    name: 'Groups — Группы и пиксели',
    basePath: '/api/groups',
    tokenRequired: true,
    endpoints: {
      GET: [
        { path: '/api/groups/by-teacher/:id', description: 'Группы преподавателя', request: 'Path: id', response: 'Массив', type: 'array' },
        { path: '/api/groups/table', description: 'Таблица students_groups', request: '—', response: 'Все связи', type: 'array' },
        { path: '/api/groups/pixels/:id', description: 'Пиксели студентов группы', request: 'Path: id группы', response: 'name + поля pixels', type: 'array' },
        { path: '/api/groups/list', description: 'Список групп', request: '—', response: '{ id, name }', type: 'array' },
      ],
      POST: [
        { path: '/api/groups/list', description: 'Создать группу', request: 'name', response: '{ success, data: { id } }', type: 'object', roles: '1, 4, 6' },
        {
          path: '/api/groups/pixels/clear-all',
          description: 'Обнулить все столбцы пикселей у всех студентов',
          request: '—',
          response: '{ success, message, affectedRows }',
          type: 'object',
          roles: '1, 4, 6',
        },
      ],
      PUT: [
        { path: '/api/groups/pixels', description: 'Обновить пиксели студента', request: 'id_student; поля: part_of_comp, make_content, invite_friend, clean_kvantum, filled_project_card_on_time, finished_project_with_product, regional_competition, interregional_competition, all_russian_competition, international_competition, nto, become_an_engineering_volunteer, help_with_event, make_own_event, special_achievements, fine', response: '{ success, data: { ok, affected } }', type: 'object' },
        { path: '/api/groups/list/:id', description: 'Переименовать группу', request: 'Path: id; name', response: '{ success, data: { ok } }', type: 'object', roles: '1, 4, 6' },
      ],
      DELETE: [
        { path: '/api/groups/list/:id', description: 'Удалить группу', request: 'Path: id', response: '{ success, data: { ok } }', type: 'object', roles: '1, 4, 6' },
      ],
    },
  },
};

const METHOD_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function responseTypeLabel(type) {
  if (type === 'array') return 'Массив';
  if (type === 'file') return 'Файл';
  return 'Объект';
}

module.exports = {
  DOC_VERSION,
  DOC_DATE,
  GENERAL,
  ERROR_CODES,
  API_DATA,
  METHOD_ORDER,
  responseTypeLabel,
};
