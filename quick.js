(() => {
'use strict';
const $=id=>document.getElementById(id);
const canvas=$('comic'),ctx=canvas.getContext('2d');
const STORE='ai4koma.quick.v1',WIZARD='ai4koma.wizard.v1',TRANSFER='ai4koma.quick.transfer.v1';
const panelTitles=['起｜はじまり','承｜出来事','転｜大事件','結｜オチ'];
const demoScenes=[
 '学校の屋上でミケは空を飛ぶ方法を考えていた。',
 '突然、給食のパンが宇宙船に変身してしまった！',
 '発射ボタンを押したら、なぜか教室ごと宇宙へ飛び出した！',
 '帰ってきたら、校長先生が宇宙服で給食を食べていた。'
];
const demoLines=['いつか宇宙に行きたいニャ！','パンが宇宙船になった!?','学校ごと飛ぶの!?','給食は地球で食べたい…'];
const fresh=()=>({version:1,title:'わたしの4コマ漫画',hero:'ミケ（宇宙に行きたいねこ）',type:'cat',theme:'school',layout:'vertical',palette:'pop',panels:demoScenes.map((scene,i)=>({scene,speech:demoLines[i]}))});
let project=fresh(),seed=0,scheduled=false,persistTimer=null;
const safe=(v,len)=>String(v??'').slice(0,len);
const typeFor=s=>/ねこ|猫|にゃ|ニャ/.test(s)?'cat':/ロボ|機械|AI|メカ/.test(s)?'robot':/宇宙人|異星人|エイリアン/.test(s)?'alien':/ラーメン|プリン|おにぎり|パン|食べもの/.test(s)?'food':'human';
const themeFor=s=>/宇宙|星|銀河|惑星/.test(s)?'space':/学校|教室|給食|先生/.test(s)?'school':/公園|森|花|木|山/.test(s)?'park':/家|部屋|リビング|寝る/.test(s)?'room':'city';
const speechFor=(s,i)=>{
 const match=s.match(/[「『]([^」』]{1,50})[」』]/);
 if(match)return match[1];
 return ['よーし、がんばるぞ！','えっ、どういうこと!?','そんなのアリ!?','なんでこうなるの〜！'][i];
};
function normalize(raw){
 if(!raw||typeof raw!=='object'||!Array.isArray(raw.panels)||raw.panels.length!==4)throw Error('4コマの編集データではありません');
 const base=fresh(),choices={type:['cat','human','robot','alien','food'],theme:['school','city','room','space','park'],layout:['vertical','grid'],palette:['pop','pastel','cool']};
 for(const key of Object.keys(choices)) if(choices[key].includes(raw[key]))base[key]=raw[key];
 base.title=safe(raw.title,50);base.hero=safe(raw.hero,100);
 base.panels=raw.panels.map(p=>({scene:safe(p?.scene,180),speech:safe(p?.speech,90)}));
 return base;
}
function loadInitial(){
 try{
  const raw=sessionStorage.getItem(WIZARD);
  if(raw){
    const answers=JSON.parse(raw);
    if(Array.isArray(answers)&&answers.length===5){
      project={...fresh(),hero:safe(answers[0],100),panels:answers.slice(1).map((s,i)=>({scene:safe(s,180),speech:speechFor(s,i)}))};
      project.type=typeFor(answers[0]);project.theme=themeFor(answers.slice(1).join(''));
      sessionStorage.removeItem(WIZARD);
      return '5つの質問を引き継いだよ！';
    }
  }
 }catch(e){}
 try{
  const saved=localStorage.getItem(STORE);
  if(saved){project=normalize(JSON.parse(saved));return '前回の作品をこのブラウザから復元したよ！';}
 }catch(e){}
 return 'サンプル漫画から始めよう！';
}
function escNumber(n){return Math.max(1,Math.min(99,Math.round(Number(n)||1)))}
function status(msg){$('status').textContent=msg;}
function renderFields(){
 $('title').value=project.title;$('hero').value=project.hero;
 for(const key of ['type','theme','layout','palette'])$(key).value=project[key];
 const root=$('panelFields');root.replaceChildren();
 project.panels.forEach((p,i)=>{
  const wrap=document.createElement('div');wrap.className='panelEdit';
  const title=document.createElement('h3');title.textContent=(i+1)+'コマ目　'+panelTitles[i];
  wrap.append(title);
  for(const [name,label,max,rows] of [['scene','場面の説明',180,3],['speech','ふきだしのセリフ',90,2]]){
    const lbl=document.createElement('label');lbl.className='field';lbl.textContent=label;
    const input=document.createElement('textarea');input.rows=rows;input.maxLength=max;input.value=p[name];input.dataset.idx=String(i);input.dataset.field=name;
    input.addEventListener('input',()=>{project.panels[i][name]=input.value;schedule()});
    lbl.append(input);wrap.append(lbl);
  }root.append(wrap);
 });
 schedule();
}
function saveSoon(){
 clearTimeout(persistTimer);persistTimer=setTimeout(()=>{
  try{localStorage.setItem(STORE,JSON.stringify(project));}catch(e){status('ブラウザの保存容量を超えたので、編集データを保存してください。');}
 },250);
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;draw();saveSoon()});}
function box(x,y,w,h,fill,stroke='#101222',lineWidth=4,r=0){
 ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(r,w/2,h/2));ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.lineWidth=lineWidth;ctx.strokeStyle=stroke;ctx.stroke();}
}
function ellipse(x,y,rx,ry,fill,stroke='#1b243c',sw=3){
 ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke();}
}
function line(x1,y1,x2,y2,color='#172343',width=3){
 ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.lineCap='round';ctx.stroke();
}
function triangle(coords,fill,stroke='#1c243a',sw=3){
 ctx.beginPath();ctx.moveTo(coords[0],coords[1]);ctx.lineTo(coords[2],coords[3]);ctx.lineTo(coords[4],coords[5]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke();}
}
function star(x,y,r,color='#ffe067'){
 ctx.save();ctx.translate(x,y);ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,d=i%2?r*.46:r;ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d)}ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();
}
function text(t,x,y,size=24,color='#151f40',weight=800,align='left'){
 ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.font=weight+' '+size+'px system-ui,-apple-system,"Noto Sans JP",sans-serif';ctx.fillText(t,x,y);
}
function wrapText(str,maxWidth,maxLines,size,weight=700){
 ctx.font=weight+' '+size+'px system-ui,-apple-system,"Noto Sans JP",sans-serif';
 const rows=[];let row='';
 for(const c of Array.from(String(str).replace(/\r/g,''))){
  if(c==='\n'){rows.push(row);row='';continue;}
  if(row&&ctx.measureText(row+c).width>maxWidth){rows.push(row);row=c;}else row+=c;
 }
 if(row)rows.push(row);
 if(rows.length>maxLines){rows.length=maxLines;let last=rows[maxLines-1];while(last&&ctx.measureText(last+'…').width>maxWidth)last=last.slice(0,-1);rows[maxLines-1]=last+'…';}
 return rows.length?rows:[''];
}
function palette(){if(project.palette==='pastel')return ['#ffe6f2','#e1efff','#f6e6ff','#e3fff4'];if(project.palette==='cool')return ['#b9e9fd','#bed4fd','#e8ccff','#d4fff1'];return ['#ffe8a8','#bdeeff','#f6ceff','#c8f5d8'];}
function drawBackground(theme,w,h,i){
 ctx.save();const g=ctx.createLinearGradient(0,0,w,h);const p=palette();g.addColorStop(0,p[i]);g.addColorStop(1,'#ffffff');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 const floor=h*.78;
 if(theme==='space'){
  for(let k=0;k<20;k++){const x=(41+k*89+i*31+seed*17)%w,y=(26+k*53+i*27+seed*11)%(h*.7);star(x,y,3+k%3,'#477fc0')}
  ellipse(w*.16,h*.45,w*.12,w*.15,'#88c6ea','#6895d0',2);ellipse(w*.2,h*.48,w*.045,w*.033,'#bde9da',null);
  ellipse(w*.69,h*.29,w*.055,w*.055,'#fbd789',null);
 }else if(theme==='school'){
  ctx.fillStyle='#fdf9e8';ctx.fillRect(0,h*.29,w,h*.52);
  for(let k=0;k<4;k++){box(w*(.05+k*.245),h*.30,w*.17,h*.27,'#d4f2ff','#5897b0',3,5);
   line(w*(.05+k*.245),h*.435,w*(.22+k*.245),h*.435,'#6faabb',3)}
  box(w*.1,h*.68,w*.38,h*.16,'#d0a67a','#69513c',4,7);
 }else if(theme==='park'){
  ellipse(w*.2,h*.82,w*.48,h*.2,'#b6e9a4',null);ellipse(w*.72,h*.81,w*.46,h*.26,'#a2dfa4',null);
  for(const [x,y] of [[w*.16,h*.48],[w*.5,h*.46]]){box(x-8,y,16,h*.33,'#95663d',null);ellipse(x,y,w*.075,h*.15,'#70c887','#469b67',2)}
 }else if(theme==='room'){
  line(0,floor,w,floor,'#b99ec0',5);box(w*.05,h*.56,w*.37,h*.21,'#b4b1f4','#5e6498',4,18);
  box(w*.08,h*.52,w*.3,h*.12,'#d0cafa','#5e6498',3,14);box(w*.04,h*.29,w*.2,h*.17,'#b7e5ff','#768fca',4,7);
 }else{
  for(let k=0;k<7;k++){const bw=w*.14,bx=k*bw,by=h*(.25+(k%3)*.09);box(bx,by,bw-2,h*.82-by,k%2?'#c8ddf5':'#ebd0d1','#98a0c5',2,1);
   for(let z=0;z<3;z++)box(bx+13,by+20+z*30,20,15,'#fff7ca',null)}
 }
 if(theme!=='space'){ctx.fillStyle='#ffffff87';ctx.fillRect(0,h*.78,w,h*.22);}
 star(w*.82,h*.16,13,'#fff7b1');ctx.restore();
}
function character(cx,cy,scale,type,sceneIndex){
 ctx.save();ctx.translate(cx,cy);ctx.scale(scale,scale);
 ctx.shadowColor='#26334f44';ctx.shadowBlur=15;ctx.shadowOffsetY=11;
 const eye=sceneIndex===2?'surprise':sceneIndex===3?'happy':'normal';
 ellipse(0,26,86,20,'#323d6540',null);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 if(type==='cat'){
  ellipse(0,-82,56,78,'#68b7ea','#233a65',5);ellipse(0,-141,70,63,'#ffe7c7','#233a65',5);
  triangle([-67,-163,-50,-240,-12,-197],'#fff2d8','#233a65',5);triangle([13,-196,51,-242,68,-164],'#fff2d8','#233a65',5);
  triangle([-51,-179,-45,-214,-30,-194],'#f5a4aa',null);triangle([30,-194,45,-214,51,-179],'#f5a4aa',null);
  ellipse(-29,-147,7,12,'#25304b',null);ellipse(30,-147,7,12,'#25304b',null);triangle([-7,-125,7,-125,0,-117],'#ed8d97',null);
  line(-11,-112,0,-108,'#35405a',3);line(0,-108,13,-112,'#35405a',3);
  [-1,1].forEach(a=>{line(a*29,-121,a*72,-129,'#233a65',2);line(a*29,-114,a*72,-110,'#233a65',2)});
  ellipse(-53,-43,18,30,'#ffe7c7','#233a65',4);ellipse(53,-43,18,30,'#ffe7c7','#233a65',4);
 }else if(type==='robot'){
  box(-56,-140,112,145,'#70cfe4','#27334d',6,22);
  box(-80,-218,160,108,'#d7ecfc','#27334d',6,16);
  box(-60,-201,120,70,'#152d50','#27334d',2,15);
  ellipse(-27,-167,12,17,'#95f7fc',null);ellipse(27,-167,12,17,'#95f7fc',null);
  box(-25,-134,50,8,'#a4f9b3',null,0,3);line(0,-218,0,-248,'#293455',6);ellipse(0,-257,12,12,'#ffcf59','#293455',3);
  box(-86,-93,24,90,'#a0dbf0','#27334d',4,10);box(62,-93,24,90,'#a0dbf0','#27334d',4,10);
 }else if(type==='alien'){
  ellipse(0,-68,49,74,'#ad86ed','#33435e',5);ellipse(0,-157,86,82,'#a5dfba','#33435e',5);
  ellipse(-36,-162,22,36,'#212d4f',null);ellipse(36,-162,22,36,'#212d4f',null);
  ellipse(-32,-171,7,12,'white',null);ellipse(39,-171,7,12,'white',null);
  ellipse(0,-122,14,7,'#6cbaa0',null);ellipse(-62,-45,20,30,'#a5dfba','#33435e',4);ellipse(62,-45,20,30,'#a5dfba','#33435e',4);
 }else if(type==='food'){
  box(-69,-113,138,93,'#f5a55a','#573b5c',6,20);ellipse(0,-118,72,20,'#fff3ba','#573b5c',5);
  ellipse(0,-171,65,61,'#ffc669','#573b5c',5);ellipse(-22,-174,6,9,'#332846',null);ellipse(24,-174,6,9,'#332846',null);
  ctx.beginPath();ctx.arc(1,-155,18,0,Math.PI);ctx.strokeStyle='#853d60';ctx.lineWidth=4;ctx.stroke();
  ellipse(-70,-53,15,25,'#ffc669','#573b5c',3);ellipse(70,-53,15,25,'#ffc669','#573b5c',3);
 }else{
  ellipse(0,-66,55,76,'#5c7bd1','#28344b',5);ellipse(0,-156,74,72,'#ffd9af','#28344b',5);
  ctx.beginPath();ctx.arc(0,-168,75,Math.PI,Math.PI*2);ctx.lineWidth=40;ctx.strokeStyle='#493565';ctx.stroke();
  ellipse(-29,-151,7,11,'#33364d',null);ellipse(29,-151,7,11,'#33364d',null);
  ellipse(0,-129,17,8,'#dc8a85',null);ellipse(-63,-45,17,30,'#ffd9af','#28344b',4);ellipse(63,-45,17,30,'#ffd9af','#28344b',4);
 }
 if(eye==='surprise'){ellipse(87,-190,9,24,'#ffbd36',null);star(91,-224,15,'#ffcc40')}
 if(eye==='happy'){star(91,-195,19,'#ffdb51');star(-93,-175,15,'#ffd656')}
 ctx.restore();
}
function panelScene(i,x,y,w,h){
 const p=project.panels[i];ctx.save();ctx.translate(x,y);
 box(0,0,w,h,'#fff','#101e35',6,5);
 ctx.save();ctx.beginPath();ctx.rect(4,4,w-8,h-8);ctx.clip();
 drawBackground(project.theme,w,h,i);
 // Comic energy accents
 for(let k=0;k<5;k++){line(w*.72+k*8,20,w*.78+k*11,6,'#fff7ff',3)}
 const compact=w<600;
 const cScale=Math.min(w/550,h/345)*.92;
 character(w*(.77+((seed%3)-1)*.018),h*.96,cScale,project.type,i);
 const labelWidth=compact?115:145;
 box(12,12,labelWidth,33,'#253460',null,0,7);
 text(String(i+1)+'コマ目　'+['起','承','転','結'][i],23,29,compact?17:20,'white',950);
 // Scene caption lower left, avoid character overlap
 const caption=String(p.scene||'').trim()||'何が起きたのかな？';
 const captionW=w*.69;
 const sceneSize=compact?Math.max(17,Math.floor(w/26)):Math.min(28,Math.floor(w/30));
 const sceneLines=wrapText(caption,captionW-26,3,sceneSize,750);
 const captionH=sceneLines.length*(sceneSize+7)+21;
 box(13,h-captionH-14,captionW,captionH,'#fffffff0','#333d62',2,10);
 sceneLines.forEach((t,j)=>text(t,26,h-captionH+2+j*(sceneSize+7),sceneSize,'#1c2440',800));
 // Speech bubble above character; generated comic lettering
 const bubbleW=w*.48,bubbleH=compact?80:95,bubbleX=w-bubbleW-14,bubbleY=h*.16;
 box(bubbleX,bubbleY,bubbleW,bubbleH,'white','#1b2641',4,23);
 triangle([bubbleX+bubbleW*.66,bubbleY+bubbleH-2,bubbleX+bubbleW*.8,bubbleY+bubbleH-2,bubbleX+bubbleW*.77,bubbleY+bubbleH+17],'white','#1b2641',3);
 line(bubbleX+bubbleW*.67,bubbleY+bubbleH-2,bubbleX+bubbleW*.79,bubbleY+bubbleH-2,'white',6);
 const phrase=(p.speech||'…').trim();
 let fs=Math.min(compact?20:25,Math.max(14,Math.floor(w/25)));
 const rows=wrapText(phrase,bubbleW-28,3,fs,950);
 rows.forEach((txt,j)=>text(txt,bubbleX+bubbleW/2,bubbleY+bubbleH/2+(j-(rows.length-1)/2)*(fs+5),fs,'#202842',950,'center'));
 if(i===2){text('!?',w*.53,h*.34,Math.min(75,h*.19),'#ef4e5b',1000,'center');}
 if(i===3){star(35+seed%4*13,h*.25,16,'#ffe065');}
 ctx.restore();ctx.restore();
}
function draw(){
 const grid=project.layout==='grid';canvas.width=grid?1200:1000;canvas.height=grid?1180:1570;
 const W=canvas.width,H=canvas.height;ctx.clearRect(0,0,W,H);ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
 // Bold comic cover strip
 box(18,15,W-36,94,'#23224b','#171b32',4,5);
 star(58,56,25,'#ffe153');
 const title=project.title.trim()||'わたしの4コマ漫画';let sz=grid?40:44;
 while(sz>23){ctx.font='1000 '+sz+'px system-ui';if(ctx.measureText(title).width<W-230)break;sz-=2;}
 text(title,100,58,sz,'#fff3b5',1000);text('COMIC LAB',W-31,59,18,'#87e9f1',900,'right');
 const margin=18,gap=10,top=124,bottom=53;
 if(grid){
   const w=(W-margin*2-gap)/2,h=(H-top-bottom-gap)/2;
   for(let i=0;i<4;i++)panelScene(i,margin+(i%2)*(w+gap),top+Math.floor(i/2)*(h+gap),w,h);
 }else{
   const w=W-margin*2,h=(H-top-bottom-gap*3)/4;
   for(let i=0;i<4;i++)panelScene(i,margin,top+i*(h+gap),w,h);
 }
 box(18,H-41,W-36,28,'#dfeaff',null,0,3);
 text('サイ校プロジェクト岩国　｜　4コマ漫画工房',W/2,H-27,16,'#2c4772',900,'center');
}
function getFilename(ext){const n=(project.title.trim()||'4コマ漫画').replace(/[\\/:*?"<>|]/g,'').slice(0,30);return n+'.'+ext;}
function download(blob,name){
 const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function png(){
 if(!canvas.toBlob){status('この端末では画像保存に対応していません');return;}
 canvas.toBlob(blob=>{if(!blob){status('画像保存に失敗しました');return;}download(blob,getFilename('png'));status('PNG画像を保存したよ！');},'image/png');
}
function saveProject(){download(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),getFilename('json'));status('編集データを保存したよ！');}
function hydrateWizard(a){
 project={...fresh(),hero:safe(a[0],100),type:typeFor(a[0]),theme:themeFor(a.slice(1).join('')),
  panels:a.slice(1).map((s,i)=>({scene:safe(s,180),speech:speechFor(s,i)}))};
}
function updateValue(key){project[key]=$(key).value;schedule();}
function demo(){const d=fresh();project=d;renderFields();status('サンプルを読み込んだよ！');}
function toStudio(){
 try{
  sessionStorage.setItem(TRANSFER,JSON.stringify(project));
  window.location.href='studio.html';
 }catch(e){status('保存領域にアクセスできません。作品をJSON保存してから詳細スタジオへ移動してね。');}
}
function loadJson(e){
 const file=e.target.files?.[0];if(!file)return;
 if(file.size>300000){status('ファイルが大きすぎます。300KB以下の編集データを選んでね。');return;}
 const reader=new FileReader();
 reader.onload=()=>{
  try{project=normalize(JSON.parse(reader.result));renderFields();status('編集データを読み込んだよ！');}
  catch(err){status('このモードで作った編集データではありません。');}
 };
 reader.onerror=()=>status('ファイルを読み込めませんでした');
 reader.readAsText(file);e.target.value='';
}
function buildAIComicPrompt(){
 const details=project.panels.map((p,i)=>String(i+1)+'コマ目（'+panelTitles[i]+'）\n場面：'+String(p.scene||'').trim()+'\nセリフ：'+String(p.speech||'').trim()).join('\n\n');
 return [
 '以下の指示を参考に、オリジナルの日本語4コマ漫画の完成画像を1枚生成してください。',
 '作品タイトル：'+(project.title||'わたしの4コマ漫画'),
 '主人公：'+(project.hero||'かわいいオリジナルキャラクター'),
 '雰囲気：'+({pop:'明るくポップ',pastel:'柔らかくパステル',cool:'クールでスタイリッシュ'}[project.palette]||'ポップ'),
 '構成：'+(project.layout==='grid'?'2×2に4コマを配置':'上から下へ縦4コマを配置'),
 '主人公の顔・体格・髪型・服・色は全コマで同じ人物だとわかるよう統一してください。',
 'コマを1から4まで視覚的にはっきり区切り、起承転結がわかるようにしてください。',
 'シーンごとに変化がわかる構図にして、セリフは原稿どおりの日本語で読みやすく配置してください。',
 '文字が難しい場合は吹き出しのみのバージョンも作成してください。',
 '実在の人・企業の著作権で保護されたキャラクターに似せないでください。',
 '【4コマの原稿】\n'+details,
 '完成した4コマ漫画の画像を生成してください。'
 ].join('\n\n');
}
async function copyAIPrompt(){
 const prompt=buildAIComicPrompt(),area=$('aiPromptText');
 if(area)area.value=prompt;
 let success=false;
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(prompt);success=true;}}catch(e){}
 if(!success&&area){
  area.focus();area.select();
  try{success=document.execCommand('copy');}catch(e){}
 }
 status(success?'4コマ漫画のAI画像指示文をコピーしたよ！ ChatGPTに貼り付けてね。':'指示文を下の欄に表示したよ。選択してコピーしてね。');
}
$('copyAIPrompt').onclick=copyAIPrompt;
status(loadInitial());renderFields();
['title','hero','type','theme','layout','palette'].forEach(key=>$(key).addEventListener(['title','hero'].includes(key)?'input':'change',()=>updateValue(key)));
$('demo').onclick=demo;$('rerender').onclick=()=>{seed++;schedule();status('イラストを描き直したよ！');};
$('savePng').onclick=png;$('saveJson').onclick=saveProject;$('print').onclick=()=>{draw();window.print();};
$('loadJson').addEventListener('change',loadJson);$('toStudio').onclick=toStudio;
})();