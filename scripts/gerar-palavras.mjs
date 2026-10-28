/* Gera a cópia para abrir o jogo via file://. Os JSON continuam sendo a fonte. */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
export async function build(root=resolve(fileURLToPath(new URL('..',import.meta.url)))){
 const lists={};
 for(const name of ['words.json','palavra.json'])lists[name]=JSON.parse(await readFile(resolve(root,'dados',name),'utf8'));
 const output='/* Gerado de words.json e palavra.json por scripts/gerar-palavras.mjs. Não editar manualmente. */\nwindow.HUBA_WORD_LISTS='+JSON.stringify(lists)+';\n';
 await writeFile(resolve(root,'dados/wording-listas.js'),output);
 return Object.keys(lists);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)build().then(names=>console.log('Listas preparadas: '+names.join(', '))).catch(e=>{console.error(e.message);process.exitCode=1});
