import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export async function generate({ root = process.cwd(), date = dayKey(), fetcher = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error('Data inválida');
  const folder = resolve(root, 'dados/bits-us'), target = resolve(folder, date + '.json');
  try {
    const saved = JSON.parse(await readFile(target, 'utf8'));
    if (saved.country !== 'US' || saved.date !== date || saved.schema !== 1) throw Error('Arquivo existente inválido');
    let latest; try { latest = JSON.parse(await readFile(resolve(folder, 'latest.json'), 'utf8')); } catch(e) { if(e.code !== 'ENOENT') throw e; }
    if (!latest || latest.date <= date) { await writeFile(resolve(folder, 'latest.json.tmp'), JSON.stringify(saved)+'\n'); await rename(resolve(folder, 'latest.json.tmp'), resolve(folder, 'latest.json')); }
    return { preserved: true, date };
  }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  async function get(endpoint) {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetcher('https://api.deezer.com/' + endpoint, { signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw Error('HTTP ' + response.status);
        const data = await response.json(); if (data.error) throw Error(data.error.message || 'Erro Deezer'); return data;
      } catch (e) { if (attempt >= 2) throw e; await sleep(2000 * 2 ** attempt); }
    }
  }
  async function checkUS() { const info = await get('infos'); if (info.country_iso !== 'US') throw Error('Publicação bloqueada: Deezer identificou ' + info.country_iso + ', esperado US.'); }
  await checkUS();
  const genres = {};
  for (const [genre, id] of [['pop', 132], ['rock', 152], ['rap', 116]]) {
    await sleep(300); await checkUS();
    const data = await get('chart/' + id + '/tracks?limit=300');
    if (!Array.isArray(data.data)) throw Error('Ranking inválido: ' + genre);
    const seen = new Set();
    genres[genre] = data.data.filter(t => t && t.id && t.title && t.artist?.name && /^https:\/\//.test(t.preview || '')).flatMap(t => {
      const key = String(t.id); if (seen.has(key)) return []; seen.add(key);
      return [{ id: key, title: t.title, artist: t.artist.name }];
    });
    if (genres[genre].length < 20) throw Error('Ranking insuficiente: ' + genre);
  }
  await checkUS();
  const catalog = { schema: 1, country: 'US', date, generatedAt: new Date().toISOString(), genres };
  await mkdir(folder, { recursive: true });
  const contents = JSON.stringify(catalog) + '\n';
  await writeFile(target + '.tmp', contents); await rename(target + '.tmp', target);
  await writeFile(resolve(folder, 'latest.json.tmp'), contents); await rename(resolve(folder, 'latest.json.tmp'), resolve(folder, 'latest.json'));
  return { date, counts: Object.fromEntries(Object.entries(genres).map(([k, v]) => [k, v.length])) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  generate().then(result => console.log(JSON.stringify(result))).catch(e => { console.error(e.message); process.exitCode = 1; });
}
