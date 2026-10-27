(function(){
 var games=[
  {name:'Musical',path:'jogos/musicle/index.html',streaks:[{id:'musicle',label:'Casual'},{id:'musicle-hard',label:'Desafiador'}]},
  {name:'Wording',path:'jogos/wording/index.html',streaks:[{id:'word',label:''}]},
  {name:'Bits',path:'jogos/bits/index.html',streaks:[{id:'bits',label:''}]},
  {name:'Streakal',path:'jogos/streakal/index.html',streaks:[{id:'streakal',label:''}]}
 ];
 var grid=document.getElementById('landingGrid');
 while(games.length<9)games.push({empty:true});
 games.forEach(function(g){
   var a=document.createElement(g.path?'a':'div');
   a.className='gcard'+(g.path?' on':' soon')+(g.empty?' empty':'');
   if(g.path)a.href=g.path;
   var top=document.createElement('div');top.className='gtop';
   var name=document.createElement('span');name.className='gname';name.textContent=g.empty?'':g.name;top.appendChild(name);
   if(!g.path&&!g.empty){var tag=document.createElement('span');tag.className='gsoon';tag.textContent='Em breve';top.appendChild(tag)}
   a.appendChild(top);
   if(!g.empty){var wrap=document.createElement('div');wrap.className='gstreaks';
     if(g.name==='Streakal'){var tip=document.createElement('small');tip.textContent='Acerte músicas e supere seu recorde!';wrap.appendChild(tip)}
     (g.streaks||[{id:g.name.toLowerCase(),label:''}]).forEach(function(s){var n=HUBA.currentStreak(s.id),st=document.createElement('div');st.className='gstreak';st.innerHTML='<strong></strong><small></small>';st.firstChild.textContent=n;st.lastChild.textContent=(n===1?'dia seguido':'dias seguidos')+(s.label?' · '+s.label:'');wrap.appendChild(st)});
     a.appendChild(wrap);
   }
   grid.appendChild(a);
 });
})();
