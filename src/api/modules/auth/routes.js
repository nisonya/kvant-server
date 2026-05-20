const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getPool } = require('../../../db/connection');
const { getAccessSecret, getRefreshSecret } = require('../../jwtSecrets');
const { sendSuccess, sendError } = require('../../helpers/http');
const authMiddleware = require('../../middleware/auth');

router.post('/login', async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return sendError(res, 400, 'Введите логин и пароль');
  }

  const accessSecret = getAccessSecret();
  const refreshSecret = getRefreshSecret();
  if (!accessSecret || !refreshSecret) {
    console.error('Ошибка логина: JWT-секреты не заданы (задайте JWT_ACCESS_SECRET и JWT_REFRESH_SECRET в env или они сгенерируются при старте API)');
    return sendError(
      res,
      500,
      'Не настроены секреты JWT. Задайте в переменных окружения JWT_ACCESS_SECRET и JWT_REFRESH_SECRET (или JWT_SECRET) — либо перезапустите API, чтобы они сгенерировались.'
    );
  }

  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT id, employee_id, login, password_hash, access_level_id FROM profile WHERE login = ?',
      [login]
    );

    if (rows.length === 0) {
      return sendError(res, 401, 'Неверный логин или пароль');
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return sendError(res, 401, 'Неверный логин или пароль');
    }

    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        accessLevel: user.access_level_id 
      },
      accessSecret,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      refreshSecret,
      { expiresIn: '7d' }
    );


await pool.query(
  'INSERT INTO refresh_tokens (profile_id, token, expires_at, device_info, ip_address) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?)',
  [user.id, refreshToken, req.headers['user-agent'] || 'unknown', req.ip || 'unknown']
);
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 3600 * 1000
    });

    sendSuccess(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.employee_id || user.id,
        employee_id: user.employee_id || null,
        id_employees: user.employee_id || null,
        profile_id: user.id,
        login: user.login,
        accessLevel: user.access_level_id,
      },
    });
  } catch (err) {
    console.error('Ошибка логина:', err.message, err.stack);
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({ success: false, error: 'Ошибка сервера', details: err.message });
    }
    sendError(res, 500, 'Ошибка сервера');
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return sendError(res, 401, 'Требуется refresh-токен');
  }

  try {
    const decoded = jwt.verify(refreshToken, getRefreshSecret());

    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW() AND revoked_at IS NULL',
      [refreshToken]
    );

    if (rows.length === 0) {
      return sendError(res, 401, 'Недействительный или просроченный refresh-токен');
    }

    const profileId = rows[0].profile_id;

    const [userRows] = await pool.query(
      'SELECT id, employee_id, login, access_level_id FROM profile WHERE id = ?',
      [profileId]
    );

    if (userRows.length === 0) {
      return sendError(res, 401, 'Профиль не найден');
    }

    const user = userRows[0];

    const newAccessToken = jwt.sign(
      { 
        userId: user.id, 
        accessLevel: user.access_level_id 
      },
      getAccessSecret(),
      { expiresIn: '1h' }
    );

    res.cookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 3600 * 1000
    });

    sendSuccess(res, {
      accessToken: newAccessToken,
      user: {
        id: user.employee_id || user.id,
        employee_id: user.employee_id || null,
        id_employees: user.employee_id || null,
        profile_id: user.id,
        login: user.login,
        accessLevel: user.access_level_id
      }
    });
  } catch (err) {
    console.error('Ошибка рефреша:', err);
    sendError(res, 401, 'Недействительный refresh-токен');
  }
});

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    const pool = await getPool();
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = ?',
      [refreshToken]
    );
  }

  res.clearCookie('access_token');
  sendSuccess(res, { ok: true });
});

router.post('/change-password', authMiddleware, async (req, res) => {
  const { old_password, new_password } = req.body || {};
  const oldPassword = old_password != null ? String(old_password) : '';
  const newPassword = new_password != null ? String(new_password) : '';

  if (!oldPassword || !newPassword) {
    return sendError(res, 400, 'Нужны old_password и new_password.');
  }
  if (newPassword.length < 6) {
    return sendError(res, 400, 'Новый пароль слишком короткий (минимум 6 символов).');
  }

  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT id, password_hash FROM profile WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (rows.length === 0) {
      return sendError(res, 401, 'Пользователь не найден.');
    }

    const profile = rows[0];
    const isOldPasswordValid = await bcrypt.compare(oldPassword, profile.password_hash);
    if (!isOldPasswordValid) {
      return sendError(res, 403, 'Старый пароль неверный.');
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE profile SET password_hash = ? WHERE id = ?',
      [newHash, profile.id]
    );

    return sendSuccess(res, { ok: true });
  } catch (err) {
    console.error('change-password:', err);
    return sendError(res, 500, 'Ошибка сервера');
  }
});

module.exports = router;