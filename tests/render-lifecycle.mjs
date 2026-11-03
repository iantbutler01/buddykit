// Real browser coverage for the canvas lifetime: visibility, resizing and cleanup.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await createServer({
  root: fileURLToPath(new URL('..', import.meta.url)),
  server: { host: '127.0.0.1', port: 1468, strictPort: true },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:1468/');
  const results = await page.evaluate(async () => {
    const { mountBuddy } = await import('/src/presentation.ts');
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const results = [];
    for (const species of ['block', 'emblem', 'blob']) {
      const canvas = document.createElement('canvas');
      canvas.style.width = canvas.style.height = '120px';
      document.body.append(canvas);
      const handle = mountBuddy(canvas, { species, reducedMotion: false });
      await wait(100);
      const initial = [canvas.width, canvas.height];
      canvas.style.display = 'none';
      for (let i = 0; i < 8; i++) window.dispatchEvent(new Event('resize'));
      await wait(50);
      const hidden = [canvas.width, canvas.height];
      canvas.style.display = '';
      canvas.style.width = '160px';
      window.dispatchEvent(new Event('resize'));
      await wait(100);
      const resized = [canvas.width, canvas.height];
      for (let i = 0; i < 8; i++) window.dispatchEvent(new Event('resize'));
      const stable = [canvas.width, canvas.height];
      handle.setState('listening');
      await wait(100);
      const copy = document.createElement('canvas');
      copy.width = copy.height = 16;
      const context = copy.getContext('2d');
      context.drawImage(canvas, 0, 0, 16, 16);
      const painted = context.getImageData(0, 0, 16, 16).data.some((v, i) => i % 4 === 3 && v > 0);
      handle.destroy();
      canvas.remove();
      results.push({ species, initial, hidden, resized, stable, painted });
    }
    return results;
  });
  for (const result of results) {
    assert.deepEqual(result.initial, [240, 240], `${result.species}: 2x backing size`);
    assert.deepEqual(result.hidden, result.initial, `${result.species}: hidden resize must not multiply DPR`);
    assert.deepEqual(result.resized, [320, 240], `${result.species}: visible resize still works`);
    assert.deepEqual(result.stable, result.resized, `${result.species}: unchanged size stays stable`);
    assert.equal(result.painted, true, `${result.species}: resumes with a visible character`);
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
