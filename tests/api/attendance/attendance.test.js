const request = require('supertest');

jest.mock('../../../src/db/connection');
const mockAuth = jest.fn();
jest.mock('../../../src/api/middleware/auth', () => (req, res, next) => mockAuth(req, res, next));

const connection = require('../../../src/db/connection');
const app = require('../../setup');

describe('Attendance API', () => {
  let mockQuery;
  let mockRelease;
  let mockBeginTransaction;
  let mockCommit;
  let mockRollback;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockImplementation((req, res, next) => {
      req.user = { id: 1, accessLevel: 1 };
      next();
    });
    mockQuery = jest.fn();
    mockRelease = jest.fn();
    mockBeginTransaction = jest.fn().mockResolvedValue();
    mockCommit = jest.fn().mockResolvedValue();
    mockRollback = jest.fn().mockResolvedValue();
    connection.getPool.mockResolvedValue({
      getConnection: jest.fn().mockResolvedValue({
        query: mockQuery,
        release: mockRelease,
        beginTransaction: mockBeginTransaction,
        commit: mockCommit,
        rollback: mockRollback,
      }),
    });
  });

  describe('GET /by-group/:id', () => {
    test('возвращает посещаемость по группе', async () => {
      const rows = [
        { name: 'Иванов Иван', date_of_lesson: '2025-02-01', presence: 1 },
      ];
      mockQuery.mockResolvedValueOnce([rows, []]);
      const res = await request(app).get('/api/attendance/by-group/1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toMatchObject({ name: 'Иванов Иван', presence: 1 });
    });
    test('пустой список при отсутствии данных', async () => {
      mockQuery.mockResolvedValueOnce([[], []]);
      const res = await request(app).get('/api/attendance/by-group/1');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
    test('ошибка при невалидном id группы', async () => {
      const res = await request(app).get('/api/attendance/by-group/0');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Некорректный id группы.');
    });
  });

  describe('PUT /by-group-date', () => {
    test('возвращает посещаемость по группе и дате', async () => {
      const rows = [
        { name: 'Иванов Иван', date_of_lesson: '2025-02-01', presence: 1 },
      ];
      mockQuery.mockResolvedValueOnce([rows, []]);
      const res = await request(app)
        .put('/api/attendance/by-group-date')
        .send({ group_id: 1, date: '2025-02-01' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
    test('ошибка без group_id или date', async () => {
      const res = await request(app)
        .put('/api/attendance/by-group-date')
        .send({ group_id: 1 });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/group_id и date/);
    });
    test('ошибка при невалидном group_id', async () => {
      const res = await request(app)
        .put('/api/attendance/by-group-date')
        .send({ group_id: 0, date: '2025-02-01' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /by-group-date-new', () => {
    test('возвращает данные с id_student', async () => {
      const rows = [
        { id_student: 1, name: 'Иванов Иван', date_of_lesson: '2025-02-01', presence: 1 },
      ];
      mockQuery.mockResolvedValueOnce([rows, []]);
      const res = await request(app)
        .put('/api/attendance/by-group-date-new')
        .send({ group_id: 1, date: '2025-02-01' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0]).toHaveProperty('id_student', 1);
    });
    test('ошибка без group_id или date', async () => {
      const res = await request(app)
        .put('/api/attendance/by-group-date-new')
        .send({ date: '2025-02-01' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/group_id и date/);
    });
  });

  describe('POST /', () => {
    test('создание/обновление посещаемости — 201', async () => {
      mockQuery
        .mockResolvedValueOnce([[], []])
        .mockResolvedValueOnce([{}, []]);
      const res = await request(app)
        .post('/api/attendance/')
        .send({
          student_id: 1,
          group_id: 2,
          date_of_lesson: '2025-02-01',
          presence: 1,
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({ ok: true });
    });
    test('ошибка без обязательных полей', async () => {
      const res = await request(app)
        .post('/api/attendance/')
        .send({ student_id: 1, group_id: 2 });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/student_id, group_id, date_of_lesson, presence/);
    });
    test('400 при presence не 0 и не 1', async () => {
      const res = await request(app)
        .post('/api/attendance/')
        .send({
          student_id: 1,
          group_id: 2,
          date_of_lesson: '2025-02-01',
          presence: 2,
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/0 или 1/);
    });
    test('ошибка при невалидном student_id', async () => {
      const res = await request(app)
        .post('/api/attendance/')
        .send({
          student_id: 0,
          group_id: 2,
          date_of_lesson: '2025-02-01',
          presence: 1,
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /clear-all', () => {
    test('очищает всю посещаемость', async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 56789 }, []]);
      const res = await request(app).post('/api/attendance/clear-all').send({});
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Вся посещаемость очищена',
        affectedRows: 56789,
      });
      expect(mockBeginTransaction).toHaveBeenCalledTimes(1);
      expect(mockCommit).toHaveBeenCalledTimes(1);
      expect(mockRollback).not.toHaveBeenCalled();
    });

    test('403 при недостатке прав', async () => {
      mockAuth.mockImplementationOnce((req, res, next) => {
        req.user = { id: 10, accessLevel: 2 };
        next();
      });
      const res = await request(app).post('/api/attendance/clear-all').send({});
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Недостаточно прав/);
    });
  });
});
