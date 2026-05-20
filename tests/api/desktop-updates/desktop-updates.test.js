const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const updatesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'desktop-updates-'));
process.env.DESKTOP_UPDATES_ROOT = updatesRoot;

const app = require('../../setup');

const INSTALLER = 'Kvant Server Setup 1.0.1.exe';
const BLOCKMAP = `${INSTALLER}.blockmap`;

function writeLatestYml(installerName = INSTALLER) {
  const yml = [
    'version: 1.0.1',
    'files:',
    `  - url: ${installerName}`,
    `path: ${installerName}`,
    'sha512: fake',
    'releaseDate: 2026-04-23T00:00:00.000Z',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(updatesRoot, 'latest.yml'), yml, 'utf8');
}

describe('Desktop updates static endpoints', () => {
  beforeEach(() => {
    fs.rmSync(updatesRoot, { recursive: true, force: true });
    fs.mkdirSync(updatesRoot, { recursive: true });
    writeLatestYml(INSTALLER);
    fs.writeFileSync(path.join(updatesRoot, INSTALLER), Buffer.from('exe-file'));
    fs.writeFileSync(path.join(updatesRoot, BLOCKMAP), Buffer.from('blockmap-file'));
  });

  afterAll(() => {
    delete process.env.DESKTOP_UPDATES_ROOT;
    fs.rmSync(updatesRoot, { recursive: true, force: true });
  });

  test('GET /desktop-updates/latest.yml returns manifest with no-cache', async () => {
    const res = await request(app).get('/desktop-updates/latest.yml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/yaml|text\/plain/);
    expect(res.headers['cache-control']).toMatch(/no-cache/);
    expect(res.text).toMatch(/path:\s*Kvant Server Setup 1.0.1\.exe/);
  });

  test('GET /desktop-updates/:installerName.exe returns installer binary', async () => {
    const encoded = encodeURIComponent('Kvant Server Setup 1.0.1');
    const res = await request(app).get(`/desktop-updates/${encoded}.exe`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/octet-stream/);
  });

  test('GET /desktop-updates/:installerName.exe.blockmap returns blockmap binary', async () => {
    const encoded = encodeURIComponent('Kvant Server Setup 1.0.1');
    const res = await request(app).get(`/desktop-updates/${encoded}.exe.blockmap`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/octet-stream/);
  });

  test('GET /desktop-updates/latest.yml returns 404 if referenced installer missing', async () => {
    writeLatestYml('Missing Setup 2.0.0.exe');
    const res = await request(app).get('/desktop-updates/latest.yml');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('GET /desktop-updates/:installerName.exe returns 404 if file missing', async () => {
    const encoded = encodeURIComponent('Missing Setup 2.0.0');
    const res = await request(app).get(`/desktop-updates/${encoded}.exe`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
