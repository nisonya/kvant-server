/** @deprecated Используйте npm run doc:api */
require('child_process').spawnSync(process.execPath, [require('path').join(__dirname, 'generate-api-documentation.js')], {
  stdio: 'inherit',
});
