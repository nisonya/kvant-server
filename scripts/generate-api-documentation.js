/**
 * Генерирует полную документацию API: Markdown, DOCX, HTML, PDF.
 * npm run doc:api
 */

const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
} = require('docx');
const {
  DOC_VERSION,
  DOC_DATE,
  GENERAL,
  ERROR_CODES,
  API_DATA,
  METHOD_ORDER,
  responseTypeLabel,
} = require('./api-documentation-data');

const OUT_DIR = path.join(__dirname, '..', 'docs');
const MD_PATH = path.join(OUT_DIR, 'API_DOCUMENTATION.md');
const DOCX_PATH = path.join(OUT_DIR, 'API_DOCUMENTATION.docx');
const PDF_PATH = path.join(OUT_DIR, 'API_DOCUMENTATION.pdf');
const HTML_PATH = path.join(OUT_DIR, 'API_DOCUMENTATION.html');

const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
};

function createTableCell(text, bold = false) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text: text || '—', bold, size: 20 })],
      }),
    ],
  });
}

function createEndpointTable(endpoints) {
  const headerRow = new TableRow({
    children: [
      createTableCell('Путь', true),
      createTableCell('Описание', true),
      createTableCell('Запрос', true),
      createTableCell('Ответ', true),
      createTableCell('Тип', true),
      createTableCell('Права', true),
    ],
  });
  const rows = [headerRow];
  for (const ep of endpoints) {
    rows.push(
      new TableRow({
        children: [
          createTableCell(ep.path),
          createTableCell(ep.description),
          createTableCell(ep.request),
          createTableCell(ep.response),
          createTableCell(responseTypeLabel(ep.type)),
          createTableCell(ep.roles || '—'),
        ],
      })
    );
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
    borders: TABLE_BORDERS,
  });
}

function buildDocxChildren() {
  const children = [];

  children.push(
    new Paragraph({
      text: 'Документация API Kvant Server',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Версия API: ${DOC_VERSION}`, bold: true }),
        new TextRun({ text: `  |  Дата документа: ${DOC_DATE}  |  Протокол: ${GENERAL.protocol}` }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    })
  );

  children.push(
    new Paragraph({ text: '1. Общие сведения', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    new Paragraph({ text: `Базовый URL: ${GENERAL.baseUrl}`, spacing: { after: 100 } }),
    new Paragraph({ text: `Формат успеха: ${GENERAL.successFormat}`, spacing: { after: 100 } }),
    new Paragraph({ text: `Формат ошибки: ${GENERAL.errorFormat}`, spacing: { after: 100 } }),
    new Paragraph({ text: `Content-Type: ${GENERAL.contentType}`, spacing: { after: 100 } }),
    new Paragraph({ text: GENERAL.auth, spacing: { after: 100 } }),
    new Paragraph({ text: GENERAL.accessLevels, spacing: { after: 100 } }),
    new Paragraph({ text: GENERAL.desktopUpdates, spacing: { after: 400 } })
  );

  let moduleNum = 2;
  for (const module of Object.values(API_DATA)) {
    children.push(
      new Paragraph({
        text: `${moduleNum}. ${module.name}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: `Базовый путь: ${module.basePath}  •  ${module.tokenRequired ? 'Токен требуется' : 'Токен не требуется'}`,
        spacing: { after: 300 },
      })
    );
    moduleNum++;

    for (const method of METHOD_ORDER) {
      const eps = module.endpoints[method];
      if (!eps?.length) continue;
      children.push(
        new Paragraph({ text: `Метод ${method}`, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } }),
        createEndpointTable(eps),
        new Paragraph({ text: '', spacing: { after: 200 } })
      );
    }
  }

  children.push(
    new Paragraph({ text: `${moduleNum}. Коды HTTP-ответов`, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } })
  );
  const errorRows = [
    new TableRow({
      children: [createTableCell('Код', true), createTableCell('Описание', true)],
    }),
    ...ERROR_CODES.map(([code, desc]) =>
      new TableRow({ children: [createTableCell(code), createTableCell(desc)] })
    ),
  ];
  children.push(
    new Table({
      width: { size: 60, type: WidthType.PERCENTAGE },
      rows: errorRows,
      borders: TABLE_BORDERS,
    })
  );

  return children;
}

async function writeDocx() {
  const doc = new Document({ sections: [{ properties: {}, children: buildDocxChildren() }] });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(DOCX_PATH, buffer);
  console.log('DOCX:', DOCX_PATH);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Экранирование ячеек markdown-таблицы */
function mdCell(text) {
  return String(text || '—').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

/** Приближение к якорям GitHub для заголовков вида «N. Name» */
function githubHeadingAnchor(sectionNum, name) {
  const slug = `${sectionNum}-${name}`
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/[^a-z0-9а-яё\-]/gi, '');
  return slug;
}

function buildMarkdown() {
  const lines = [];
  const moduleEntries = Object.values(API_DATA);
  let sectionNum = 2;

  lines.push('# Документация API Kvant Server', '');
  lines.push(`**Версия:** ${DOC_VERSION}  `);
  lines.push(`**Дата:** ${DOC_DATE}  `);
  lines.push(`**Протокол:** ${GENERAL.protocol}`, '');
  lines.push('---', '');
  lines.push('## Оглавление', '');
  lines.push('1. [Общие сведения](#1-общие-сведения)');
  for (const mod of moduleEntries) {
    lines.push(`${sectionNum}. [${mod.name}](#${githubHeadingAnchor(sectionNum, mod.name)})`);
    sectionNum++;
  }
  lines.push(`${sectionNum}. [Коды HTTP-ответов](#${sectionNum}-коды-http-ответов)`, '');
  lines.push('---', '');
  lines.push('## 1. Общие сведения', '');
  lines.push(`**Базовый URL:** \`${GENERAL.baseUrl}\``, '');
  lines.push('| Успех | Ошибка |');
  lines.push('|-------|--------|');
  lines.push(`| \`${GENERAL.successFormat}\` | \`${GENERAL.errorFormat}\` |`, '');
  lines.push(`**Content-Type:** ${GENERAL.contentType}`, '');
  lines.push('**Авторизация:**', '', GENERAL.auth, '');
  lines.push('**Уровни доступа:**', '', GENERAL.accessLevels, '');
  lines.push('**Desktop updates:**', '', GENERAL.desktopUpdates, '');
  lines.push('---', '');

  sectionNum = 2;
  for (const mod of moduleEntries) {
    lines.push(`## ${sectionNum}. ${mod.name}`, '');
    lines.push(`**Базовый путь:** \`${mod.basePath}\`  `);
    lines.push(`**Токен:** ${mod.tokenRequired ? 'требуется' : 'не требуется'}`, '');

    for (const method of METHOD_ORDER) {
      const eps = mod.endpoints[method];
      if (!eps?.length) continue;
      lines.push(`### Метод ${method}`, '');
      lines.push('| Путь | Описание | Запрос | Ответ | Тип | Права |');
      lines.push('|------|----------|--------|-------|-----|-------|');
      for (const ep of eps) {
        lines.push(
          `| \`${mdCell(ep.path)}\` | ${mdCell(ep.description)} | ${mdCell(ep.request)} | ${mdCell(ep.response)} | ${mdCell(responseTypeLabel(ep.type))} | ${mdCell(ep.roles || '—')} |`
        );
      }
      lines.push('');
    }
    lines.push('---', '');
    sectionNum++;
  }

  lines.push(`## ${sectionNum}. Коды HTTP-ответов`, '');
  lines.push('| Код | Описание |');
  lines.push('|-----|----------|');
  for (const [code, desc] of ERROR_CODES) {
    lines.push(`| ${code} | ${desc} |`);
  }
  lines.push('');
  lines.push('---', '');
  lines.push(
    '*Сгенерировано командой `npm run doc:api`. Источник данных: `scripts/api-documentation-data.js`.*',
    ''
  );

  return lines.join('\n');
}

function writeMarkdown() {
  const md = buildMarkdown();
  fs.writeFileSync(MD_PATH, md, 'utf8');
  console.log('Markdown:', MD_PATH);
}

function buildHtml() {
  const rows = (eps) =>
    eps
      .map(
        (ep) => `<tr>
      <td class="path">${escapeHtml(ep.path)}</td>
      <td>${escapeHtml(ep.description)}</td>
      <td>${escapeHtml(ep.request)}</td>
      <td>${escapeHtml(ep.response)}</td>
      <td>${escapeHtml(responseTypeLabel(ep.type))}</td>
      <td>${escapeHtml(ep.roles || '—')}</td>
    </tr>`
      )
      .join('');

  let modulesHtml = '';
  let n = 2;
  for (const module of Object.values(API_DATA)) {
    let methodsHtml = '';
    for (const method of METHOD_ORDER) {
      const eps = module.endpoints[method];
      if (!eps?.length) continue;
      methodsHtml += `<h3>Метод ${method}</h3>
      <table>
        <thead><tr>
          <th>Путь</th><th>Описание</th><th>Запрос</th><th>Ответ</th><th>Тип</th><th>Права</th>
        </tr></thead>
        <tbody>${rows(eps)}</tbody>
      </table>`;
    }
    modulesHtml += `<section class="module">
      <h2>${n}. ${escapeHtml(module.name)}</h2>
      <p class="meta"><strong>${escapeHtml(module.basePath)}</strong> — ${module.tokenRequired ? 'токен обязателен' : 'без токена'}</p>
      ${methodsHtml}
    </section>`;
    n++;
  }

  const errorsHtml = ERROR_CODES.map(([c, d]) => `<tr><td>${c}</td><td>${escapeHtml(d)}</td></tr>`).join('');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Документация API Kvant Server</title>
  <style>
    @page { margin: 18mm 14mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1a1a1a; line-height: 1.35; }
    h1 { text-align: center; font-size: 22pt; margin-bottom: 0.2em; }
    .subtitle { text-align: center; color: #444; margin-bottom: 1.5em; }
    h2 { font-size: 14pt; margin-top: 1.2em; border-bottom: 2px solid #2563eb; padding-bottom: 0.2em; page-break-after: avoid; }
    h3 { font-size: 11pt; color: #2563eb; margin-top: 0.8em; page-break-after: avoid; }
    p { margin: 0.4em 0; }
    .meta { background: #f1f5f9; padding: 0.5em 0.75em; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 0.5em 0 1em; font-size: 8.5pt; page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 6px; vertical-align: top; text-align: left; }
    th { background: #e2e8f0; font-weight: 600; }
    td.path { font-family: Consolas, monospace; font-size: 8pt; word-break: break-all; }
    section.module { page-break-before: auto; }
    .general li { margin: 0.25em 0; }
  </style>
</head>
<body>
  <h1>Документация API Kvant Server</h1>
  <p class="subtitle">Версия ${escapeHtml(DOC_VERSION)} · ${escapeHtml(DOC_DATE)} · ${escapeHtml(GENERAL.protocol)}</p>

  <section>
    <h2>1. Общие сведения</h2>
    <ul class="general">
      <li><strong>Базовый URL:</strong> ${escapeHtml(GENERAL.baseUrl)}</li>
      <li><strong>Успех:</strong> ${escapeHtml(GENERAL.successFormat)}</li>
      <li><strong>Ошибка:</strong> ${escapeHtml(GENERAL.errorFormat)}</li>
      <li><strong>Авторизация:</strong> ${escapeHtml(GENERAL.auth)}</li>
      <li><strong>Уровни доступа:</strong> ${escapeHtml(GENERAL.accessLevels)}</li>
      <li><strong>Desktop updates:</strong> ${escapeHtml(GENERAL.desktopUpdates)}</li>
    </ul>
  </section>

  ${modulesHtml}

  <section>
    <h2>${n}. Коды HTTP-ответов</h2>
    <table><thead><tr><th>Код</th><th>Описание</th></tr></thead><tbody>${errorsHtml}</tbody></table>
  </section>
</body>
</html>`;
}

function wrapMarkdownHtml(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Документация API Kvant Server</title>
  <style>
    @page { margin: 16mm 12mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #111; line-height: 1.4; max-width: 100%; padding: 0 8px; }
    h1 { font-size: 20pt; border-bottom: 2px solid #2563eb; padding-bottom: 0.3em; page-break-after: avoid; }
    h2 { font-size: 14pt; margin-top: 1.2em; color: #1e40af; page-break-after: avoid; }
    h3, h4 { font-size: 11pt; page-break-after: avoid; }
    table { width: 100%; border-collapse: collapse; margin: 0.6em 0 1em; font-size: 8.5pt; page-break-inside: auto; }
    th, td { border: 1px solid #cbd5e1; padding: 4px 6px; vertical-align: top; text-align: left; }
    th { background: #e2e8f0; }
    tr { page-break-inside: avoid; }
    pre, code { font-family: Consolas, monospace; font-size: 8.5pt; background: #f8fafc; }
    pre { padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px; white-space: pre-wrap; word-break: break-word; page-break-inside: avoid; }
    code { padding: 1px 4px; }
    hr { border: none; border-top: 1px solid #cbd5e1; margin: 1.5em 0; }
    ul { margin: 0.3em 0 0.8em 1.2em; }
    a { color: #2563eb; text-decoration: none; }
    p { margin: 0.4em 0; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

async function buildHtmlFromMarkdown() {
  if (!fs.existsSync(MD_PATH)) {
    console.warn('Markdown не найден, PDF будет из табличной сводки:', MD_PATH);
    return buildHtml();
  }
  let marked;
  try {
    marked = require('marked');
  } catch {
    console.warn('Пакет marked не установлен — PDF из табличной сводки. npm install --save-dev marked');
    return buildHtml();
  }
  const md = fs.readFileSync(MD_PATH, 'utf8');
  const body = marked.parse(md, { async: false });
  return wrapMarkdownHtml(body);
}

async function writeHtml() {
  const html = await buildHtmlFromMarkdown();
  fs.writeFileSync(HTML_PATH, html, 'utf8');
  console.log('HTML:', HTML_PATH);
  return html;
}

async function writePdf(html) {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    console.error('Для PDF установите зависимость: npm install --save-dev puppeteer');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: PDF_PATH,
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', right: '14mm', bottom: '18mm', left: '14mm' },
    });
    console.log('PDF:', PDF_PATH);
  } finally {
    await browser.close();
  }
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  writeMarkdown();
  await writeDocx();
  const html = await writeHtml();
  await writePdf(html);

  console.log('\nГотово: docs/API_DOCUMENTATION.md | .pdf | .docx');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
