/* Funções compartilhadas pelos jogos e pela página inicial. */
window.HUBA = (function(){
  function dayKey(){var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function hash(s){var h=2166136261; for(var i=0;i<s.length;i++){h^=s.charCodeAt(i); h=Math.imul(h,16777619)} return h>>>0}
  function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function shuffle(arr,rng){for(var i=arr.length-1;i>0;i--){var j=Math.floor(rng()*(i+1)),t=arr[i];arr[i]=arr[j];arr[j]=t} return arr}
  function norm(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()}
  function keyOf(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function streakKey(id){return 'playhub:'+id+':streak:v1'}
  function readStreak(id){try{return JSON.parse(localStorage.getItem(streakKey(id)))||{}}catch(e){return {}}}
  function currentStreak(id){var st=readStreak(id),y=new Date();y.setDate(y.getDate()-1);return (st.last===dayKey()||st.last===keyOf(y))?(st.count||0):0}
  function recordDailyStreak(id){var st=readStreak(id),today=dayKey(),y=new Date();y.setDate(y.getDate()-1);if(st.last===today)return;st.count=(st.last===keyOf(y))?(st.count||0)+1:1;st.last=today;st.best=Math.max(st.best||0,st.count);try{localStorage.setItem(streakKey(id),JSON.stringify(st))}catch(e){}}
  return {dayKey:dayKey,hash:hash,mulberry:mulberry,shuffle:shuffle,norm:norm,currentStreak:currentStreak,recordDailyStreak:recordDailyStreak};
})();
