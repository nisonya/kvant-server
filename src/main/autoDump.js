const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const { getDbConfig } = require('../common/envLoader');
const { isSetupDone } = require('./setupMarker');
const { log } = require('./mainLog');
const { exportSeed } = require('./ipcHandlers');

const DUMP_DIR = 'autobackup';
const DUMP_NAME = 'kvant-autodump.sql';
/** Локальный час суток для первого и последующих срабатываний (0–23). */
const DUMP_HOUR_LOCAL = 3;

let timeoutId = null;
let intervalId = null;

function canExportDatabase() {
  if (!isSetupDone()) return false;
  const c = getDbConfig();
  if (!c) return false;
  if (!String(c.host || '').trim()) return false;
  if (!String(c.user || '').trim()) return false;
  if (!String(c.database || '').trim()) return false;
  return true;
}

function msUntilNextLocalHour(hour) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

/**
 * Один цикл: тот же SQL, что и ручной экспорт / import-db (INSERT из всех таблиц).
 * Файл всегда один — перезапись предыдущего дампа.
 */
async function writeAutoDumpOnce() {
  if (!canExportDatabase()) return;
  const base = app.getPath('userData');
  const dir = path.join(base, DUMP_DIR);
  await fs.mkdir(dir, { recursive: true });
  const finalPath = path.join(dir, DUMP_NAME);
  const tmpPath = `${finalPath}.tmp`;
  const r = await exportSeed(tmpPath, null);
  if (!r.success) {
    log(`Автодамп БД: ошибка — ${r.message}`, true);
    try {
      await fs.unlink(tmpPath);
    } catch (_) {}
    return;
  }
  try {
    try {
      await fs.unlink(finalPath);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    await fs.rename(tmpPath, finalPath);
  } catch (e) {
    log(`Автодамп: не удалось сохранить файл: ${e.message}`, true);
    try {
      await fs.unlink(tmpPath);
    } catch (_) {}
    return;
  }
  log(`Автодамп БД: ${finalPath}`);
}

function startAutoDailyDump() {
  stopAutoDailyDump();
  if (!app || typeof app.getPath !== 'function') return;

  const tick = () => {
    writeAutoDumpOnce().catch((err) => log(`Автодамп: ${err.stack || err}`, true));
  };

  const delay = msUntilNextLocalHour(DUMP_HOUR_LOCAL);
  timeoutId = setTimeout(() => {
    tick();
    intervalId = setInterval(tick, 24 * 60 * 60 * 1000);
  }, delay);
}

function stopAutoDailyDump() {
  if (timeoutId != null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = {
  startAutoDailyDump,
  stopAutoDailyDump,
  writeAutoDumpOnce,
};
