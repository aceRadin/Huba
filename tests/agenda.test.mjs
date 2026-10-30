import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {prepare} from '../scripts/preparar-catalogos.mjs';
test('agenda antecipa dois dias, congela dias publicados e mantém arquivos antigos',async t=>{
 const root=await mkdtemp(join(tmpdir(),'hubdle-agenda-'));t.after(()=>rm(root,{recursive:true,force:true}));
 let requests=0;
 function fake(folder,name){return async({date})=>{requests++;const dir=join(root,'dados',folder);await mkdir(dir,{recursive:true});const file=date+'.js';await writeFile(join(dir,file),'// '+date);await writeFile(join(dir,'config.js'),'window.'+name+'='+JSON.stringify({enabled:true,date,version:date,files:{rock:file}})+';')}}
 const options={root,generateBits:fake('bits-artistas','HUBA_BITS_PREPARADO'),generatePlaylists:fake('playlists','HUBA_PLAYLISTS_PREPARADO')};
 const a=await prepare({...options,date:'2026-10-30'});assert.equal(a.readyThrough,'2026-11-01');assert.equal(requests,2);
 await prepare({...options,date:'2026-10-30'});assert.equal(requests,2,'mesmo dia não consulta novamente');
 await prepare({...options,date:'2026-10-31'});assert.equal(requests,4);
 const ctx={window:{}};vm.runInNewContext(await readFile(join(root,'dados/playlists/config.js'),'utf8'),ctx);
 const manifest=ctx.window.HUBA_PLAYLISTS_PREPARADO;
 assert.equal(manifest.date,'2026-10-31');assert.equal(manifest.version,a.playlistsVersion,'dia preparado não muda na atualização seguinte');
 assert.equal(manifest.days['2026-11-02'].version,'2026-11-02');
 assert.equal(await readFile(join(root,'dados/playlists/2026-11-01.js'),'utf8'),'// 2026-11-01');
 const before=await readFile(join(root,'.cache/publicacao/agenda.json'),'utf8');
 await assert.rejects(prepare({...options,date:'2026-11-01',generateBits:async()=>{throw Error('offline')}}),/offline/);
 assert.equal(await readFile(join(root,'.cache/publicacao/agenda.json'),'utf8'),before,'falha não sobrescreve a agenda válida');
});
