const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../jogos/wording/wording.js'),'utf8');
const keyCode=source.slice(source.indexOf('function wKey(k){'),source.indexOf('function wShake(){'));
function game(slots,pos){const ctx={w:{slots:slots.slice(),pos,done:false},renderWord(){}};vm.createContext(ctx);vm.runInContext(keyCode,ctx);return ctx}
test('apagar a última letra no meio da palavra retorna ao início',()=>{
 const ctx=game(['','','a','',''],2);ctx.wKey('back');assert.equal(ctx.w.pos,0);
 ctx.wKey('b');assert.equal(ctx.w.slots[0],'b');
});
test('Backspace repetido remove letras e placeholders e permanece no início',()=>{
 const ctx=game(['a',' ','b',' ','c'],0);
 for(let i=0;i<12;i++)ctx.wKey('back');
 assert.equal(ctx.w.slots.join(''),'');assert.equal(ctx.w.pos,0);
 ctx.wKey('x');assert.equal(ctx.w.slots[0],'x');
});
test('linha vazia com cursor no meio volta à primeira casa',()=>{
 const ctx=game(['','','','',''],3);ctx.wKey('back');assert.equal(ctx.w.pos,0);
});
test('mantém espaço como placeholder e edição das casas preenchidas',()=>{
 const ctx=game(['','','','',''],0);ctx.wKey('space');ctx.wKey('a');
 assert.equal(ctx.w.slots[0],' ');assert.equal(ctx.w.slots[1],'a');
 ctx.w.pos=1;ctx.wKey('back');assert.equal(ctx.w.slots[0],' ');assert.equal(ctx.w.slots[1],'');
 ctx.wKey('back');assert.equal(ctx.w.pos,0);
});
