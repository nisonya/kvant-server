const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

function getUpdatesRoot() {
  const configured = String(process.env.DESKTOP_UPDATES_ROOT || process.env.DESKTOP_UPDATES_DIR || '').trim();
  return configured || path.join(process.cwd(), 'desktop-updates');
}

function stripQuotes(value) {
  const v = String(value || '').trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function resolveInsideRoot(root, relativePath) {
  const rootAbs = path.resolve(root);
  const targetAbs = path.resolve(rootAbs, relativePath);
  const rel = path.relative(rootAbs, targetAbs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return targetAbs;
}

function extractInstallerFileName(yamlContent) {
  const lines = String(yamlContent).split(/\r?\n/);
  let candidate = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('path:')) {
      candidate = stripQuotes(trimmed.slice('path:'.length).trim());
      break;
    }
  }

  if (!candidate) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('url:')) {
        candidate = stripQuotes(trimmed.slice('url:'.length).trim());
        break;
      }
      if (trimmed.startsWith('- url:')) {
        candidate = stripQuotes(trimmed.slice('- url:'.length).trim());
        break;
      }
    }
  }

  if (!candidate || !candidate.toLowerCase().endsWith('.exe')) return null;
  return candidate;
}

async function ensureLatestManifestIntegrity(rootDir) {
  const latestPath = resolveInsideRoot(rootDir, 'latest.yml');
  if (!latestPath) return { ok: false, code: 404, error: 'Файл latest.yml не найден.' };

  let yaml;
  try {
    yaml = await fs.readFile(latestPath, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return { ok: false, code: 404, error: 'Файл latest.yml не найден.' };
    throw err;
  }

  const installerName = extractInstallerFileName(yaml);
  if (!installerName) {
    return { ok: false, code: 404, error: 'В latest.yml не найден installer (*.exe).' };
  }

  const installerPath = resolveInsideRoot(rootDir, installerName);
  const blockmapPath = resolveInsideRoot(rootDir, `${installerName}.blockmap`);
  if (!installerPath || !blockmapPath) {
    return { ok: false, code: 404, error: 'Некорректный путь файлов обновления.' };
  }

  try {
    await fs.access(installerPath);
    await fs.access(blockmapPath);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return { ok: false, code: 404, error: 'Файлы версии из latest.yml не найдены.' };
    }
    throw err;
  }

  return { ok: true, yaml };
}

async function sendBinaryFile(res, relativeFileName) {
  const rootDir = getUpdatesRoot();
  const filePath = resolveInsideRoot(rootDir, relativeFileName);
  if (!filePath) {
    return res.status(404).json({ success: false, error: 'Файл не найден' });
  }
  try {
    const data = await fs.readFile(filePath);
    res.setHeader('Content-Type', 'application/octet-stream');
    return res.status(200).send(data);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return res.status(404).json({ success: false, error: 'Файл не найден' });
    }
    console.error('desktop-updates.sendBinaryFile:', err);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
}

router.get('/latest.yml', async (_req, res) => {
  try {
    const checked = await ensureLatestManifestIntegrity(getUpdatesRoot());
    if (!checked.ok) {
      return res.status(checked.code).json({ success: false, error: checked.error });
    }
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(checked.yaml);
  } catch (err) {
    console.error('desktop-updates.latest.yml:', err);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.get('/:installerName.exe', async (req, res) => {
  const installerName = decodeURIComponent(req.params.installerName);
  return sendBinaryFile(res, `${installerName}.exe`);
});

router.get('/:installerName.exe.blockmap', async (req, res) => {
  const installerName = decodeURIComponent(req.params.installerName);
  return sendBinaryFile(res, `${installerName}.exe.blockmap`);
});

module.exports = router;
