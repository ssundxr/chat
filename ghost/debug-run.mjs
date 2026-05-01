import('./dist/cli/index.js').catch(e => {
  console.error('ERR', e && e.stack ? e.stack : e);
  process.exit(1);
});