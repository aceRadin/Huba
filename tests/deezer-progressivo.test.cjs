/* Execute com node --test tests/deezer-progressivo.test.cjs.
 * Requer Playwright e Chromium/Chrome. Veja docs/carregamento-musical.md.
 * Toda resposta do Deezer é simulada: nenhuma playlist real é consultada.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.HUBA_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

test('Deezer: carregamento, partidas, falhas e diários', { timeout: 180000 }, async t => {
  const server = http.createServer(async (req, res) => {
    try {
      const name = new URL(req.url, 'http://localhost').pathname;
      const file = path.join(root, name.endsWith('/') ? name + 'index.html' : name);
      res.setHeader('Content-Type', ({ html: 'text/html', js: 'application/javascript', css: 'text/css', json: 'application/json' })[path.extname(file).slice(1)] || 'application/octet-stream');
      res.end(await fs.readFile(file));
    } catch { res.statusCode = 404; res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, ...(process.env.HUBA_CHROME ? { executablePath: process.env.HUBA_CHROME } : {}) });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });
  const metrics = [];

  async function fixture({ game = 'musicle', latency = 90, fail = () => false, baseline = false, nativeAudio = false, rankings = false } = {}) {
    const context = await browser.newContext();
    await context.route('https://fonts.googleapis.com/**', r => r.abort());
    await context.route('https://fonts.gstatic.com/**', r => r.abort());
    await context.route('**/playlists.js*', r => r.fulfill({ contentType: 'application/javascript', body: r.request().url().includes('/bits/')
      ? "window.HUBA_BITS_MUSICAS={fontes:['top: playlist:10, playlist:11','pop: playlist:20','rock: playlist:10, playlist:11','rap: playlist:40']};"
      : "window.HUBA_MUSICAS={fontes:['rock: playlist:10, playlist:11','pop: playlist:20']};" }));
    if (!rankings) await context.route('**/jogos/bits/rankings.js*', r => r.fulfill({ contentType: 'application/javascript', body: "window.HUBA_BITS_MUSICAS={fontes:['top: playlist:10, playlist:11','pop: playlist:20','rock: playlist:10, playlist:11','rap: playlist:40']};" }));
    // A simulação permite verificar src, recuperação, placar e o segundo do replay.
    if (nativeAudio) {
      await context.addInitScript(() => {
        const NativeAudio = window.Audio; window.testAudio = [];
        window.Audio = function () { const audio = new NativeAudio(); testAudio.push(audio); return audio; };
      });
      const wav = Buffer.alloc(44 + 30 * 8000 * 2);
      wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
      wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
      wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
      await context.route('https://audio.huba.test/**', r => r.fulfill({ contentType: 'audio/wav', body: wav }));
    } else await context.addInitScript(() => {
      window.testAudio = [];
      window.Audio = class extends EventTarget {
        constructor() { super(); this.currentTime = 0; this.duration = 30; this.paused = true; this.seeking = false; this.src = ''; this.starts = []; window.testAudio.push(this); }
        load() { if (this.src) setTimeout(() => { this.onloadedmetadata?.(); this.dispatchEvent(new Event('loadedmetadata')); }, 0); }
        set src(value) { this._src = value; if (value) this.load(); }
        get src() { return this._src; }
        pause() { this.paused = true; }
        play() { this.paused = false; this.starts.push(this.currentTime); this.onplaying?.(); return Promise.resolve(); }
        removeAttribute(name) { if (name === 'src') this.src = ''; }
        getAttribute(name) { return name === 'src' ? this.src : null; }
      };
    });
    if (baseline) {
      const original = execFileSync(process.env.HUBA_GIT || 'git', ['show', `HEAD:jogos/${game}/${game}.js`], { cwd: root, encoding: 'utf8' });
      await context.route(`**/jogos/${game}/${game}.js*`, r => r.fulfill({ contentType: 'application/javascript', body: original }));
    }
    const requests = [], errors = [];
    let inflight = 0, maxInflight = 0;
    await context.route('https://api.deezer.com/**', async route => {
      const url = new URL(route.request().url());
      const playlist = /\/playlist\/(\d+)/.exec(url.pathname)?.[1];
      const track = /\/track\/(\d+)/.exec(url.pathname)?.[1];
      const chart = /\/chart\/(\d+)/.exec(url.pathname)?.[1];
      const cb = /[?&]callback=([^&]+)/.exec(url.href)?.[1];
      const index = Number(url.searchParams.get('index') || 0), limit = Number(url.searchParams.get('limit') || 100);
      const request = { playlist, track, chart, index, limit, time: Date.now(), url: url.href };
      requests.push(request); inflight++; maxInflight = Math.max(maxInflight, inflight);
      await sleep(track ? 5 : latency);
      function song(id) { return { id, title: 'Faixa ' + id, artist: { name: 'Artista ' + id }, preview: 'https://audio.huba.test/audio/' + id, album: {} }; }
      let data;
      const failure = fail(request, requests);
      if (failure) data = { error: { code: failure === true ? 700 : failure, message: 'Falha simulada' } };
      else if (track) data = { ...song(Number(track)), preview: 'https://audio.huba.test/fresh/' + track };
      else if (chart) {
        const start = chart === '132' ? 1 : chart === '152' ? 201 : 401;
        const records = Array.from({ length: 300 }, (_, i) => song(start + i));
        if (chart === '116') delete records[299].preview;
        data = { data: records.slice(index, index + limit), total: Math.min(limit, records.length) };
      }
      else {
        const start = playlist === '11' ? 141 : playlist === '20' ? 1001 : playlist === '40' ? 2001 : 1;
        const records = Array.from({ length: 160 }, (_, i) => song(start + i));
        records.push(song(start), { id: 9000, title: 'Sem áudio', artist: { name: 'Teste' } });
        data = { data: records.slice(index, index + limit), total: records.length };
        if (index + limit < records.length) data.next = `https://api.deezer.com/playlist/${playlist}/tracks?index=${index + limit}&limit=${limit}`;
      }
      inflight--;
      try { await route.fulfill({ contentType: 'application/javascript', body: cb + '(' + JSON.stringify(data) + ');' }); } catch { /* requisição cancelada */ }
    });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + `/jogos/${game}/`);
    await page.waitForSelector(game === 'bits' ? '#randomTiles button' : '#tilesRandom button');
    return { context, page, requests, errors, max: () => maxInflight };
  }
  async function choose(f, game, daily = false, genre = 'Rock') {
    const container = game === 'bits' ? (daily ? '#dailyTiles' : '#randomTiles') : (daily ? '#tilesDaily' : '#tilesRandom');
    const before = Date.now();
    await f.page.locator(container + ' button').filter({ hasText: genre }).click();
    try { await f.page.locator(game === 'bits' ? '#bitsGame' : '#play').waitFor({ state: 'visible' }); }
    catch (e) { console.error('DIAGNÓSTICO', game, f.errors, await f.page.locator(game === 'bits' ? '#loadStatus' : '#dzStatus').textContent(), f.requests); throw e; }
    return Date.now() - before;
  }
  async function done(f) {
    await f.page.waitForFunction(() => document.querySelector('#gameCatalogCount').textContent.includes('concluído'));
    assert.equal(f.errors.length, 0, f.errors.join('\n'));
  }
  async function loaderState(f, genre = 'rock') {
    return f.page.locator('#gameCatalogCount').textContent();
  }

  await t.test('Bits usa rankings de Pop/Rock/Rap; Top reúne os três sem duplicatas', async () => {
    const f = await fixture({ game: 'bits', rankings: true });
    assert.equal(f.requests.length, 0);
    for (const [genre, count] of [['Pop', 300], ['Rock', 300], ['Rap', 299]]) {
      await choose(f, 'bits', false, genre); await done(f);
      assert.match(await loaderState(f), new RegExp('^' + count + ' músicas'));
      await f.page.locator('#backGame').click();
    }
    assert.equal(f.requests.filter(r => r.chart).length, 3);
    assert.ok(f.requests.filter(r => r.chart).every(r => r.limit === 300));
    await choose(f, 'bits', true, 'Top'); await done(f);
    assert.match(await loaderState(f), /^699 músicas/);
    assert.equal(f.requests.filter(r => r.chart).length, 3, 'Top reutiliza os rankings já recebidos');
    await f.page.locator('#guessInput').fill('Faixa 699');
    await f.page.locator('#suggestions button').filter({ hasText: 'Faixa 699' }).click();
    await f.page.locator('#submitGuess').click();
    const saved = await f.page.evaluate(() => Object.entries(localStorage).find(([k]) => k.startsWith('huba:bits:daily:v2:rankings:'))[1]);
    await f.page.locator('#backGame').click(); await choose(f, 'bits', true, 'Top');
    assert.equal(await f.page.locator('#history .bits-history-line').count(), 1);
    assert.equal(f.requests.filter(r => r.playlist).length, 0);
    const second = await fixture({ game: 'bits', rankings: true, latency: 5 });
    await choose(second, 'bits', true, 'Top'); await second.page.locator('#skipGuess').click();
    const other = await second.page.evaluate(() => Object.entries(localStorage).find(([k]) => k.startsWith('huba:bits:daily:v2:rankings:'))[1]);
    assert.equal(JSON.parse(saved).id, JSON.parse(other).id);
    assert.equal(f.errors.length + second.errors.length, 0);
    await f.context.close(); await second.context.close();
  });

  for (const game of ['musicle', 'bits', 'streakal']) await t.test(game + ': entra antes do fim, cresce sem duplicar e reutiliza cache', async () => {
    const f = await fixture({ game, latency: 180 });
    assert.equal(f.requests.length, 0, 'não consulta playlists ao abrir a página');
    const ms = await choose(f, game, false);
    const initial = Number((await loaderState(f)).split(' ')[0]);
    assert.equal(initial, game === 'musicle' ? 5 : game === 'bits' ? 1 : 2);
    assert.ok(f.requests.filter(r => r.playlist).length < 5);
    const optionsBefore = game !== 'bits' ? await f.page.locator('#opts button').allTextContents() : null;
    if (game === 'bits') {
      await f.page.locator('#guessInput').fill('Faixa 299');
      assert.match(await f.page.locator('#selectedText').textContent(), /chegando/);
    }
    await done(f);
    assert.match(await loaderState(f), /^300 músicas carregadas/);
    if (game !== 'bits') assert.deepEqual(await f.page.locator('#opts button').allTextContents(), optionsBefore, 'alternativas atuais não mudam com novas páginas');
    else {
      await f.page.locator('#suggestions button').filter({ hasText: 'Faixa 299' }).click();
      await f.page.locator('#submitGuess').click();
      assert.equal(await f.page.locator('#history .bits-history-line').count(), 1);
    }
    const count = f.requests.filter(r => r.playlist).length;
    await f.page.locator(game === 'bits' ? '#backGame' : '#backBtn').click();
    await choose(f, game, false);
    assert.equal(f.requests.filter(r => r.playlist).length, count, 'gênero concluído não é baixado novamente');
    assert.equal(f.max(), 1, 'fila serial');
    const times = f.requests.map(r => r.time);
    for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= 200, 'intervalo entre requisições');
    metrics.push({ game, progressiveMs: ms, initialSongs: initial, uniqueSongs: 300, playlistRequests: count });
    assert.equal(f.errors.length, 0); await f.context.close();
  });

  await t.test('Musical: cinco perguntas e cinco alternativas no Desafiador', async () => {
    const f = await fixture(); await f.page.locator('#clipHard').click(); await choose(f, 'musicle');
    for (let i = 0; i < 5; i++) { assert.equal(await f.page.locator('#opts button').count(), 5); await f.page.locator('#opts button').first().click(); await f.page.locator('#nextBtn').click(); }
    assert.equal(await f.page.locator('#result').isVisible(), true); assert.equal(f.errors.length, 0); await f.context.close();
  });

  await t.test('troca rápida descarta o gênero anterior ainda em carregamento', async () => {
    const f = await fixture({ latency: 450 });
    await f.page.locator('#tilesRandom button').filter({ hasText: 'Rock' }).click();
    assert.equal(await f.page.locator('#tilesRandom button').filter({ hasText: 'Pop' }).isEnabled(), true);
    await choose(f, 'musicle', false, 'Pop'); await done(f);
    assert.match(await f.page.locator('#playTitle').textContent(), /Pop/);
    for (const label of await f.page.locator('#opts button').allTextContents()) assert.match(label, /10\d\d/);
    assert.equal(f.requests.filter(r => r.playlist === '10' && r.index > 0).length, 0);
    assert.equal(f.errors.length, 0); await f.context.close();
  });

  await t.test('Streakal aguarda alternativas sem aplicar dificuldade por catálogo parcial', async () => {
    let broken = true;
    const f = await fixture({ game: 'streakal', fail: r => broken && r.playlist === '10' && r.index > 0 ? 800 : false });
    await choose(f, 'streakal');
    await f.page.waitForFunction(() => testAudio[0].src.includes('/fresh/'));
    const id = await f.page.evaluate(() => /\/(\d+)$/.exec(testAudio[0].src)[1]);
    await f.page.locator('#opts button[aria-label="Artista ' + id + ' - Faixa ' + id + '"]').click();
    assert.equal(await f.page.locator('#upgradePanel').isVisible(), true);
    await f.page.locator('#extraOption').click();
    await f.page.waitForFunction(() => document.querySelector('#replaceSong').textContent.includes('Tentar carregar'));
    assert.match(await f.page.locator('#qcount').textContent(), /Sequência: 1/);
    assert.equal(await f.page.locator('#result').isVisible(), false);
    broken = false; await f.page.locator('#replaceSong').click();
    await f.page.waitForFunction(() => document.querySelectorAll('#opts button').length === 3);
    assert.match(await f.page.locator('#qcount').textContent(), /Sequência: 1 · Rodada 2/);
    assert.equal(f.errors.length, 0); await f.context.close();
  });

  await t.test('Musical e Bits renovam a mesma faixa antes de oferecer substituição', async () => {
    for (const game of ['musicle', 'bits']) {
      const f = await fixture({ game }); await choose(f, game); await done(f);
      const original = await f.page.evaluate(() => testAudio[0].src);
      const id = /\/(\d+)$/.exec(original)[1];
      await f.page.evaluate(() => { testAudio[0].dispatchEvent(new Event('error')); testAudio[0].dispatchEvent(new Event('error')); });
      await f.page.waitForFunction(() => testAudio[0].src.includes('/fresh/'));
      assert.ok((await f.page.evaluate(() => testAudio[0].src)).endsWith('/' + id));
      assert.equal(f.requests.filter(r => r.track).length, 1, 'falhas simultâneas não duplicam a recuperação');
      assert.equal(await f.page.locator(game === 'bits' ? '#replaceAudio' : '#replaceSong').isVisible(), false);
      await f.page.evaluate(() => testAudio[0].dispatchEvent(new Event('error')));
      assert.equal(await f.page.locator(game === 'bits' ? '#replaceAudio' : '#replaceSong').isVisible(), true);
      await f.page.locator(game === 'bits' ? '#replaceAudio' : '#replaceSong').click();
      assert.equal(await f.page.locator(game === 'bits' ? '#finish' : '#result').isVisible(), false);
      assert.equal(f.errors.length, 0); await f.context.close();
    }
  });

  await t.test('cancelar e retomar preserva páginas; trocar de gênero não mistura músicas', async () => {
    const f = await fixture({ latency: 300 }); await choose(f, 'musicle');
    await f.page.locator('#backBtn').click();
    const before = f.requests.length; await sleep(700); assert.equal(f.requests.length, before);
    await choose(f, 'musicle'); await done(f);
    assert.equal(f.requests.filter(r => r.playlist === '10' && r.index === 0).length, 1, 'primeira página permanece no cache');
    await f.page.locator('#backBtn').click(); await choose(f, 'musicle', false, 'Pop');
    for (const label of await f.page.locator('#opts button').allTextContents()) assert.match(label, /10\d\d/);
    assert.equal(f.errors.length, 0); await f.context.close();
  });

  await t.test('diários aguardam catálogo completo e são iguais com latências diferentes', async () => {
    for (const game of ['musicle', 'bits', 'streakal']) {
      const signatures = [];
      for (const latency of [5, 160]) {
        const f = await fixture({ game, latency }); await choose(f, game, true); await done(f);
        if (game === 'bits') {
          await f.page.locator('#skipGuess').click();
          signatures.push(await f.page.evaluate(() => Object.entries(localStorage).find(([k]) => k.startsWith('huba:bits:daily:v2:rankings:'))[1]));
        } else {
          if (game === 'streakal') await f.page.waitForFunction(() => testAudio[0].src.includes('/fresh/'));
          signatures.push(JSON.stringify(await f.page.locator('#opts button').allTextContents()) + await f.page.evaluate(() => testAudio[0].src));
        }
        await f.context.close();
      }
      assert.equal(signatures[0], signatures[1], game + ': resultado independe da velocidade');
    }
  });

  await t.test('quota usa espera progressiva; diário não inicia com fonte incompleta', async () => {
    let failures = 0;
    const f = await fixture({ fail: r => r.playlist === '10' && r.index === 0 && failures++ < 2 ? 4 : false });
    await choose(f, 'musicle');
    const attempts = f.requests.filter(r => r.playlist === '10' && r.index === 0);
    assert.equal(attempts.length, 3); assert.ok(attempts[1].time - attempts[0].time >= 1900); assert.ok(attempts[2].time - attempts[1].time >= 3900);
    await f.context.close();
    let broken = true;
    const d = await fixture({ fail: r => broken && r.playlist === '11' ? 800 : false });
    await d.page.locator('#tilesDaily button').filter({ hasText: 'Rock' }).click();
    await d.page.waitForFunction(() => document.querySelector('#dzStatus').textContent.includes('precisa de todas'));
    assert.equal(await d.page.locator('#play').isVisible(), false);
    broken = false; await choose(d, 'musicle', true); await done(d);
    assert.equal(d.requests.filter(r => r.playlist === '10').length, 2, 'não repete páginas concluídas');
    await d.context.close();
  });

  await t.test('Streakal: 40 acertos, até 15 alternativas e recuperação sem perder placar', async () => {
    const f = await fixture({ game: 'streakal', latency: 20 }); await choose(f, 'streakal'); await done(f);
    for (let n = 0; n < 40; n++) {
      await f.page.waitForFunction(() => testAudio[0].src.includes('/fresh/'));
      const id = await f.page.evaluate(() => /\/(\d+)$/.exec(testAudio[0].src)[1]);
      await f.page.locator('#opts button[aria-label="Artista ' + id + ' - Faixa ' + id + '"]').click();
      if (await f.page.locator('#upgradePanel').isVisible()) await f.page.locator(n < 13 ? '#extraOption' : '#shorterClip').click();
      assert.ok(await f.page.locator('#opts button').count() <= 15);
    }
    assert.match(await f.page.locator('#qcount').textContent(), /Sequência: 40/);
    await f.page.waitForFunction(() => testAudio[0].src.includes('/fresh/'));
    const before = await f.page.locator('#qcount').textContent();
    const trackCount = f.requests.filter(r => r.track).length;
    await f.page.evaluate(() => { testAudio[0].dispatchEvent(new Event('error')); testAudio[0].dispatchEvent(new Event('error')); });
    await f.page.waitForFunction(() => document.querySelector('#qhint').textContent.includes('Prévia atualizada'));
    assert.equal(f.requests.filter(r => r.track).length, trackCount + 1);
    assert.equal(await f.page.locator('#qcount').textContent(), before);
    await f.page.locator('#playBtn').click(); await f.page.locator('#playBtn').click(); await f.page.locator('#playBtn').click();
    const starts = await f.page.evaluate(() => testAudio[0].starts.slice(-2)); assert.equal(starts[0], starts[1]);
    assert.equal(f.errors.length, 0); await f.context.close();
  });

  await t.test('áudio nativo do navegador reproduz e repete o mesmo trecho nos três jogos', async () => {
    for (const game of ['musicle', 'bits', 'streakal']) {
      const f = await fixture({ game, nativeAudio: true }); await choose(f, game);
      const button = game === 'bits' ? '#playAudio' : '#playBtn';
      await f.page.waitForFunction(() => testAudio[0].readyState >= 1);
      const starts = [];
      for (let i = 0; i < 2; i++) {
        await f.page.locator(button).click();
        await f.page.waitForFunction(() => !testAudio[0].paused);
        starts.push(await f.page.evaluate(() => testAudio[0].currentTime));
        if (game !== 'bits') await f.page.locator(button).click();
      }
      assert.ok(Math.abs(starts[1] - starts[0]) < 0.4, game + ': mesmo segundo do trecho');
      assert.equal(f.errors.length, 0); await f.context.close();
    }
  });

  if (process.env.HUBA_GIT) await t.test('medição comparativa com o código anterior e a mesma API simulada', async () => {
    for (const metric of metrics) {
      const f = await fixture({ game: metric.game, latency: 180, baseline: true });
      metric.beforeMs = await choose(f, metric.game);
      metric.beforePlaylistRequests = f.requests.filter(r => r.playlist).length;
      await f.context.close();
    }
  });
  console.log('MEDIÇÕES ' + JSON.stringify(metrics));
});
