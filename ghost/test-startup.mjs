import('./dist/cli/index.js').then(
  () => console.log('CLI started'),
  (e) => {
    console.error('ERR', (e && e.stack) ? e.stack : e);
    process.exit(1);
  }
);