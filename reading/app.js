'use strict';
(function(){
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const K={api:'rds_apiKey',base:'rds_baseUrl',model:'rds_model',article:'rds_article',words:'rds_words',questions:'rds_questions',stats:'rds_stats',font:'rds_fontSize',favorites:'rds_favorites',current:'rds_currentArticle'};
function get(k,d){try{const v=localStorage.getItem(k);return v===null?d:v}catch(e){return d}}
function json(k,d){try{const v=get(k,'');return v?JSON.parse(v):d}catch(e){return d}}
function put(k,v){try{localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));return true}catch(e){return false}}
const st0=json(K.stats,{});
const S={api:get(K.api,''),base:get(K.base,'https://api.deepseek.com'),model:get(K.model,'deepseek-flash'),article:get(K.article,''),words:json(K.words,[]),questions:json(K.questions,[]),stats:{calls:0,prompt:0,completion:0,total:0,...(st0||{})},favorites:json(K.favorites,[]),current:json(K.current,null),font:Number(get(K.font,'22'))||22,channel:'china',category:'综合要闻',period:'',language:'zh',favoriteFilter:'全部'};
['calls','prompt','completion','total'].forEach(k=>S.stats[k]=Math.max(0,Number(S.stats[k])||0));
if(!['deepseek-flash','deepseek-v4-pro'].includes(S.model))S.model='deepseek-flash';
const CAT={'综合要闻':'最新重点新闻','政治政策':'政治 政策 政府','宏观经济':'宏观经济 GDP 通胀 贸易','金融市场':'股市 金融 市场 债券','科技与人工智能':'科技 人工智能 AI 芯片','国际关系':'外交 国际关系 地缘政治','社会民生':'社会 民生 教育 医疗','商业与产业':'企业 商业 产业 公司','能源与气候':'能源 气候 环境','文化体育娱乐':'文化 体育 娱乐'};
const CAT_EN={'综合要闻':'top news','政治政策':'politics government policy','宏观经济':'economy inflation GDP trade','金融市场':'finance stock market bonds','科技与人工智能':'technology artificial intelligence AI chips','国际关系':'international relations diplomacy geopolitics','社会民生':'society education healthcare','商业与产业':'business industry companies','能源与气候':'energy climate environment','文化体育娱乐':'culture sports entertainment'};
const CH={china:'中国',world:'海外',weibo:'微博',douyin:'抖音'};
const FAV_CATEGORIES=['英文文章','中国新闻','海外新闻','社交热点','历史知识','其他'];
S.words=Array.isArray(S.words)?S.words.filter(x=>typeof x==='string'):[];
S.favorites=Array.isArray(S.favorites)?S.favorites.filter(x=>x&&typeof x==='object'):[];
S.favorites.forEach(a=>{if(!FAV_CATEGORIES.includes(a.category))a.category=inferFavoriteCategory(a)});
S.questions=Array.isArray(S.questions)?S.questions.filter(q=>q&&typeof q.question==='string'&&Array.isArray(q.options)&&q.options.length===4&&Number.isInteger(Number(q.correctIndex))&&Number(q.correctIndex)>=0&&Number(q.correctIndex)<4).map(q=>({question:q.question,options:q.options.map(String),correctIndex:Number(q.correctIndex),explanation:String(q.explanation||''),evidence:String(q.evidence||''),selected:q.selected===null||q.selected===undefined?null:Number(q.selected),checked:!!q.checked})):[];
const esc=v=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
function safe(v){try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:''}catch(e){return ''}}
function base(){let u;try{u=new URL(S.base.replace(/\/+$/,''))}catch(e){throw Error('接口地址格式不正确')}if(!['https:','http:'].includes(u.protocol))throw Error('接口地址只支持 HTTP 或 HTTPS');return u.href.replace(/\/+$/,'')}
function day(tz){try{return new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}catch(e){return new Date().toISOString().slice(0,10)}}
function dateText(v){if(!v)return '发布时间未知';const d=new Date(v);return isNaN(d.getTime())?'发布时间未知':d.toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}
function icon(n){const p={star:'<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',starOn:'<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.8-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" fill="currentColor"/>',speak:'<path d="M4 10v4h3l4 3V7l-4 3H4Z"/><path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>'};return '<svg viewBox="0 0 24 24" aria-hidden="true">'+p[n]+'</svg>'}
function notify(msg){return new Promise(resolve=>{const l=$('#app-modal'),a=$('#modal-actions');$('#modal-title').textContent='提示';$('#modal-message').textContent=msg;a.innerHTML='';const b=document.createElement('button');b.className='btn primary';b.textContent='确定';b.onclick=()=>{l.classList.remove('open');l.setAttribute('aria-hidden','true');resolve(true)};a.appendChild(b);l.classList.add('open');l.setAttribute('aria-hidden','false')})}
async function response(res){const raw=await res.text();let d;try{d=JSON.parse(raw)}catch(e){}if(!res.ok)throw Error('API '+res.status+'：'+(d&&d.error&&d.error.message||d&&d.message||raw.slice(0,180)));if(!d)throw Error('API 返回不是有效 JSON');return d}
async function ai(messages,opt){opt=opt||{};if(!S.api)throw Error('请先在设置页填写 API Key');const body={model:S.model,messages:messages,temperature:opt.temperature===undefined?0.2:opt.temperature,max_tokens:opt.maxTokens||8192,thinking:{type:'disabled'}};if(opt.json)body.response_format={type:'json_object'};const c=new AbortController(),timer=setTimeout(()=>c.abort(),90000);
 try{const r=await fetch(base()+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.api},body:JSON.stringify(body),signal:c.signal}),d=await response(r),choice=d.choices&&d.choices[0],content=choice&&choice.message&&choice.message.content;if(choice&&choice.finish_reason==='length')throw Error('模型输出长度不足，请缩短内容重试');if(typeof content!=='string'||!content.trim())throw Error('模型返回内容为空');if(d.usage){S.stats.calls++;S.stats.prompt+=Number(d.usage.prompt_tokens)||0;S.stats.completion+=Number(d.usage.completion_tokens)||0;S.stats.total+=Number(d.usage.total_tokens)||0;put(K.stats,S.stats);renderStats()}return content.trim()}
 catch(e){if(e.name==='AbortError')throw Error('请求超时');if(e instanceof TypeError)throw Error('网络请求失败，请检查网络和跨域设置');throw e}finally{clearTimeout(timer)}
}
async function webSearch(q,n){if(!S.api)throw Error('请先在设置页填写 API Key');const c=new AbortController(),timer=setTimeout(()=>c.abort(),90000);
 try{const r=await fetch(base()+'/v1/tools/search',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.api},body:JSON.stringify({query:q.slice(0,128),count:Math.max(1,Math.min(50,n)),need_content:true}),signal:c.signal}),d=await response(r);return Array.isArray(d.results)?d.results:[]}
 catch(e){if(e.name==='AbortError')throw Error('新闻搜索超时');if(e instanceof TypeError)throw Error('Search API 网络请求失败，请确认 API Key 和浏览器权限');throw e}finally{clearTimeout(timer)}
}
function parse(raw){let t=String(raw||'').trim().replace(/^\x60{3}(?:json)?\s*/i,'').replace(/\s*\x60{3}$/,'');try{return JSON.parse(t)}catch(e){}const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(t.slice(a,b+1))}catch(e){}}throw Error('AI 返回 JSON 格式不正确')}
function renderWords(){const box=$('#word-box');if(!box)return;box.textContent=S.words.length?S.words.join(' · '):'（暂无生词）'}
function renderStats(){['calls','prompt','completion','total'].forEach(k=>$('#stat-'+k).textContent=Number(S.stats[k]||0).toLocaleString())}
function switchTab(name){$('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));$('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='tab-'+name));const app=$('#app-content');app.classList.toggle('reader-mode',name==='read');$('#reader-actions').classList.toggle('visible',name==='read');if(name!=='read')app.scrollTo({top:0,behavior:'auto'});if(name==='favorites')renderFavorites();if(name==='read'){const doc=$('#reading-document');if(doc)doc.scrollTop=0;updateFavBtn();requestAnimationFrame(scheduleReadingFocus)}}
document.addEventListener('click',e=>{const b=e.target.closest('.tab-btn');if(!b)return;e.preventDefault();switchTab(b.dataset.tab)},true);
function channel(c){S.channel=c;$$('[data-channel]').forEach(b=>b.classList.toggle('active',b.dataset.channel===c));$('#history-controls').hidden=c!=='history';$('#category-picker').style.display=c==='history'?'none':'block';$('#btn-fetch-news').textContent=c==='history'?'搜索历史知识':'生成热点新闻';$('#source-note').textContent=['weibo','douyin'].includes(c)?'公开网页索引结果，不等同于平台官方实时热榜排名。':'实时网页检索，提供来源链接及可用原文。'}
$$('[data-channel]').forEach(b=>b.addEventListener('click',()=>channel(b.dataset.channel)));
function picker(trigger,menu,selector,cb){const t=$(trigger),m=$(menu);t.addEventListener('click',e=>{e.stopPropagation();const open=m.hidden;document.querySelectorAll('.picker-menu').forEach(x=>x.hidden=true);document.querySelectorAll('.picker-trigger').forEach(x=>x.setAttribute('aria-expanded','false'));m.hidden=!open;t.setAttribute('aria-expanded',String(open))});m.addEventListener('click',e=>{const b=e.target.closest(selector);if(!b||!m.contains(b))return;cb(b);m.hidden=true;t.setAttribute('aria-expanded','false')})}
picker('#category-trigger','#category-menu','#category-menu [data-category]',b=>{S.category=b.dataset.category;$('#category-trigger').innerHTML=esc(S.category)+' <span>⌄</span>'});
picker('#period-trigger','#period-menu','#period-menu [data-period]',b=>{S.period=b.dataset.period;$('#period-trigger').innerHTML=esc(S.period)+' <span>⌄</span>'});
picker('#model-trigger','#model-menu','#model-menu [data-model]',b=>{S.model=b.dataset.model;$('#model-trigger').innerHTML=esc(S.model)+' <span>⌄</span>'});
document.addEventListener('click',e=>{if(!e.target.closest('.picker-wrap')){$$('.picker-menu').forEach(m=>m.hidden=true);$$('.picker-trigger').forEach(t=>t.setAttribute('aria-expanded','false'))}});
$$('[data-language]').forEach(b=>b.addEventListener('click',()=>{S.language=b.dataset.language;$$('[data-language]').forEach(x=>x.classList.toggle('active',x===b))}));
$('#news-date').textContent=day('America/Toronto');
function queryNews(){const c=S.channel,cat=CAT[S.category]||'新闻';if(c==='history'){const t=$('#history-topic').value.trim();if(!t&&!S.period)throw Error('请选择历史时期或输入具体历史知识点');return ((S.period?S.period+' ':'')+(t||'历史事件')+' 历史背景 事件 史料 来源 lang:zh,en').slice(0,128)}const d=day(['china','weibo','douyin'].includes(c)?'Asia/Shanghai':'America/Toronto');if(c==='china')return ('中国 '+cat+' 今日 最新热点 after:'+d+' lang:zh').slice(0,128);if(c==='world')return ('world '+(CAT_EN[S.category]||'top news')+' latest today after:'+d+' lang:en').slice(0,128);if(c==='weibo')return ('site:weibo.com 热搜 '+cat+' after:'+d+' lang:zh').slice(0,128);if(c==='douyin')return ('site:douyin.com 抖音 热点 '+cat+' after:'+d+' lang:zh').slice(0,128);throw Error('未知新闻频道，请重新选择频道')}
function norm(x){return {title:String(x.title||'未命名来源'),url:safe(x.url),site:String(x.site_name||'网页来源'),date:x.date||'',snippet:String(x.snippet||''),summary:String(x.summary||x.snippet||''),content:String(x.content||'')}}
function sumDisplay(s){if(S.language==='en')return s.summary_en||s.summary_cn||'';if(S.language==='both')return (s.summary_cn||'')+(s.summary_en?'\n\n'+s.summary_en:'');return s.summary_cn||s.summary_en||''}
async function summarize(items){
 const input=items.map((x,i)=>({index:i+1,title:x.title,source:x.site,date:x.date,url:x.url,snippet:x.snippet,search_summary:x.summary,original_text:x.content.slice(0,3500)}));
 const sys='你是严谨新闻编辑。只根据输入搜索结果写摘要，不得编造事实、数字、时间。网页正文可用时优先依据正文。摘要语言：'+(S.language==='en'?'英文':S.language==='both'?'中英双语':'简体中文')+'。每项保留index，不增不减。只输出JSON：{"items":[{"index":1,"summary_cn":"...","summary_en":"..."}]}。';
 try{
  const d=parse(await ai([{role:'system',content:sys},{role:'user',content:JSON.stringify({results:input})}],{json:true,temperature:.1,maxTokens:Math.min(11000,1600+items.length*420)}));
  const list=Array.isArray(d.items)?d.items:[];
  return items.map((x,i)=>{
   const found=list.find(y=>Number(y.index)===i+1);
   if(found&&(found.summary_cn||found.summary_en))return {summary_cn:String(found.summary_cn||''),summary_en:String(found.summary_en||''),generated:true};
   return {summary_cn:x.summary||x.snippet,summary_en:x.summary||x.snippet,generated:false};
  });
 }catch(e){
  return items.map(x=>({summary_cn:x.summary||x.snippet,summary_en:x.summary||x.snippet,generated:false}));
 }
}
function newsList(items,sums){const box=$('#news-results');box.innerHTML='';if(!items.length){box.innerHTML='<div class="empty-state">没有找到有效来源，请调整频道或分类。</div>';return}items.forEach((x,i)=>{const b=document.createElement('button');b.className='news-item';b.innerHTML='<div class="news-item-head"><span class="news-number">NO. '+(i+1)+'</span><span class="news-source">'+esc(x.site)+'</span></div><div class="news-title">'+esc(x.title)+'</div><div class="news-summary">'+esc(sumDisplay(sums[i]||{}))+'</div><div class="news-item-foot"><span>'+esc(dateText(x.date))+'</span><span>点击阅读 ↗</span></div>';b.addEventListener('click',()=>openNews(x,sums[i]||{}));box.appendChild(b)})}
function openNews(x,s){const original=x.content.trim(),summary=sumDisplay(s),note=original?'已获取网页正文。':(s.generated===false?'未获取网页全文；当前展示搜索结果摘要，原文链接见上方。':'未获取网页全文；以下为 AI 根据搜索结果整理的摘要，原文链接见上方。'),a={id:x.url||x.title,title:x.title,kind:S.channel==='history'?'history':'news',channel:CH[S.channel]||'历史知识',source:x.site,date:x.date,url:x.url,summary:summary,originalText:original,content:original,note:note,createdAt:Date.now()};openArticle(a)}
async function fetchNews(){const b=$('#btn-fetch-news'),status=$('#news-status');let n=Math.max(1,Math.min(20,parseInt($('#news-count').value,10)||8));$('#news-count').value=n;let q;try{q=queryNews()}catch(e){status.textContent=e.message;status.className='status bad';return}b.disabled=true;status.textContent='正在搜索公开来源…';status.className='status';$('#news-results').innerHTML='<div class="empty-state">搜索中…</div>';
 try{let items=(await webSearch(q,Math.min(50,n*2))).map(norm).filter(x=>x.url&&x.title);const seen=new Set();items=items.filter(x=>{if(seen.has(x.url))return false;seen.add(x.url);return true}).slice(0,n);if(!items.length)throw Error('没有找到带来源链接的结果');status.textContent='已找到 '+items.length+' 条，整理摘要中…';const sums=await summarize(items);newsList(items,sums);status.className='status ok';status.textContent='生成 '+items.length+' 条；不足目标数量时不会虚构补齐'}catch(e){$('#news-results').innerHTML='<div class="empty-state">'+esc(e.message)+'</div>';status.className='status bad';status.textContent='获取失败'}finally{b.disabled=false}}
$('#btn-fetch-news').addEventListener('click',fetchNews);
function splitS(t){const n=String(t||'').replace(/\s+/g,' ').trim();if(!n)return [];return (n.match(/[^.!?。！？]+[.!?。！？]+[”’"'»）)\]}】』」]*|[^.!?。！？]+$/g)||[n]).map(x=>x.trim()).filter(Boolean)}
function splitP(t){const raw=String(t||'').replace(/\r\n?/g,'\n').replace(/[\u2028\u2029]/g,'\n').trim();if(!raw)return [];const hasBlankLine=/\n[\t ]*\n+/.test(raw);const parts=raw.split(hasBlankLine?/\n[\t ]*\n+/:/\n+/);return parts.map(x=>x.replace(/[\t ]+/g,' ').trim()).filter(Boolean)}
function htmlArticle(t,hi,kind){const ps=splitP(t);if(!ps.length)return '<div class="empty-state">暂无正文内容。</div>';const blocks=(kind==='news'||kind==='history')?ps.flatMap(p=>splitS(p)):ps.map(p=>splitS(p).join(' '));return blocks.map(p=>'<p class="article-paragraph">'+(kind==='news'||kind==='history'?'<span class="article-sentence">'+(hi&&p.indexOf(hi)>=0?esc(p).replace(esc(hi),'<mark>'+esc(hi)+'</mark>'):esc(p))+'</span>':splitS(p).map(x=>{let y=esc(x);if(hi&&x.indexOf(hi)>=0)y=y.replace(esc(hi),'<mark>'+esc(hi)+'</mark>');return '<span class="article-sentence">'+y+'</span>'}).join(' '))+'</p>').join('')}
function minFont(){return window.matchMedia('(max-width:700px)').matches?22:20}
function setFont(n){S.font=Math.max(minFont(),Math.min(34,Number(n)||minFont()));put(K.font,S.font);$('#article-body').style.fontSize=S.font+'px';$('#font-size-label').textContent=String(S.font);$('#font-down').disabled=S.font<=minFont();$('#font-up').disabled=S.font>=34}
$('#font-down').addEventListener('click',()=>setFont(S.font-2));$('#font-up').addEventListener('click',()=>setFont(S.font+2));window.addEventListener('resize',()=>{if(S.font<minFont())setFont(minFont())});
function inferFavoriteCategory(a){
 const channel=String(a&&a.channel||'');
 if(a&&a.kind==='history'||channel==='历史知识')return '历史知识';
 if(channel==='中国')return '中国新闻';
 if(channel==='海外')return '海外新闻';
 if(['微博','抖音','X'].includes(channel))return '社交热点';
 if(a&&a.kind==='pasted'||channel==='粘贴导入')return '英文文章';
 return '其他';
}
function favKey(a){return String(a.url||a.id||a.title||'article')}
function isFav(a){return S.favorites.some(x=>favKey(x)===favKey(a))}
function updateFavBtn(){const b=$('#btn-favorite-current'),yes=!!S.current&&isFav(S.current);b.innerHTML=icon(yes?'starOn':'star');b.classList.toggle('active',yes);b.title=yes?'取消收藏':'收藏文章'}
function scheduleReadingFocus(){
 if(S.focusFrame)return;
 S.focusFrame=requestAnimationFrame(()=>{S.focusFrame=0;updateReadingFocus()});
}
function updateReadingFocus(){
 if(!$('#tab-read').classList.contains('active'))return;
 const root=$('#reading-document'),body=$('#article-body');if(!root||!body)return;
 const rr=root.getBoundingClientRect(),target=rr.top+Math.max(75,Math.min(rr.height*.43,rr.height-140));
 let best=null,bestDistance=Infinity;
 body.querySelectorAll('.article-sentence').forEach(el=>{
  Array.from(el.getClientRects()).forEach(rect=>{
   if(rect.bottom<rr.top+55||rect.top>rr.bottom-125)return;
   const center=(rect.top+rect.bottom)/2,distance=Math.abs(center-target);
   if(distance<bestDistance){bestDistance=distance;best=el}
  });
 });
 body.querySelectorAll('.article-sentence.is-focused').forEach(el=>el.classList.remove('is-focused'));
 body.querySelectorAll('.article-paragraph.is-focused-paragraph').forEach(el=>el.classList.remove('is-focused-paragraph'));
 if(best){best.classList.add('is-focused');const p=best.closest('.article-paragraph');if(p)p.classList.add('is-focused-paragraph')}
}
$('#reading-document').addEventListener('scroll',scheduleReadingFocus,{passive:true});
function reader(){
 const a=S.current||{title:'',content:S.article};
 $('#reader-title').textContent=a.title||'';
 $('#reader-meta').textContent=[a.channel||'',a.source||'',a.date?dateText(a.date):''].filter(Boolean).join(' · ');
 const hasOriginal=!!String(a.originalText||'').trim();$('#reader-summary').hidden=!hasOriginal||!a.summary;$('#reader-summary').textContent=a.summary||'';
 const l=$('#reader-source'),u=safe(a.url);l.hidden=!u;if(u)l.href=u;
 $('#article-body').innerHTML=htmlArticle(a.content||a.originalText||a.summary||S.article,a.highlight||'',a.kind||'pasted');
 $('#original-note').hidden=!a.note;$('#original-note').textContent=a.note||'';
 setFont(S.font);updateFavBtn();scheduleReadingFocus();
}
function openArticle(a){S.current=a;S.article=a.content||a.originalText||a.summary||'';put(K.current,a);put(K.article,S.article);reader();switchTab('read')}
$('#btn-favorite-current').addEventListener('click',()=>{
 if(!S.current)return;
 const i=S.favorites.findIndex(x=>favKey(x)===favKey(S.current));
 if(i>=0)S.favorites.splice(i,1);
 else{S.current.category=S.current.category||inferFavoriteCategory(S.current);S.favorites.unshift({...S.current})}
 put(K.favorites,S.favorites);updateFavBtn();
});
function renderFavorites(){
 const box=$('#favorite-list');box.innerHTML='';$('#favorite-count').textContent=S.favorites.length+' 篇';
 $$('#favorite-filters [data-fav-filter]').forEach(b=>b.classList.toggle('active',b.dataset.favFilter===S.favoriteFilter));
 if(!S.favorites.length){box.innerHTML='<div class="empty-state">收藏的文章会保存在这台设备上。</div>';return}
 const visible=S.favorites.filter(a=>S.favoriteFilter==='全部'||(a.category||inferFavoriteCategory(a))===S.favoriteFilter);
 if(!visible.length){box.innerHTML='<div class="favorite-empty-filter">这个分类还没有文章。</div>';return}
 visible.forEach(a=>{
  const realIndex=S.favorites.indexOf(a),row=document.createElement('div');row.className='favorite-item';
  const main=document.createElement('div');main.className='favorite-item-main';
  const op=document.createElement('button');op.className='favorite-open';op.innerHTML='<div class="favorite-title">'+esc(a.title||'未命名文章')+'</div><div class="favorite-meta">'+esc(a.channel||a.kind||'文章')+' · '+esc(a.source||'本地保存')+'</div>';
  op.addEventListener('click',()=>openArticle(a));main.appendChild(op);
  const tools=document.createElement('div');tools.className='favorite-item-tools';
  const wrap=document.createElement('div');wrap.className='favorite-category-wrap';
  const trigger=document.createElement('button');trigger.className='favorite-category-trigger';trigger.type='button';trigger.textContent=(a.category||inferFavoriteCategory(a))+' ⌄';
  const menu=document.createElement('div');menu.className='favorite-category-menu';menu.hidden=true;
  FAV_CATEGORIES.forEach(cat=>{const pick=document.createElement('button');pick.type='button';pick.textContent=cat;pick.addEventListener('click',()=>{a.category=cat;put(K.favorites,S.favorites);renderFavorites()});menu.appendChild(pick)});
  trigger.addEventListener('click',e=>{e.stopPropagation();const open=menu.hidden;$$('.favorite-category-menu').forEach(m=>m.hidden=true);menu.hidden=!open});
  wrap.append(trigger,menu);
  const rm=document.createElement('button');rm.className='favorite-remove';rm.textContent='移除';
  rm.addEventListener('click',()=>{S.favorites.splice(realIndex,1);put(K.favorites,S.favorites);renderFavorites();updateFavBtn()});
  tools.append(wrap,rm);row.append(main,tools);box.appendChild(row);
 });
}
$$('#favorite-filters [data-fav-filter]').forEach(b=>b.addEventListener('click',()=>{S.favoriteFilter=b.dataset.favFilter;renderFavorites()}));
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.favorite-category-wrap'))$$('.favorite-category-menu').forEach(m=>m.hidden=true)});
function pasteArticle(t){openArticle({id:'paste-'+Date.now(),title:'我的阅读文章',kind:'pasted',channel:'粘贴导入',content:t,originalText:t})}
$('#btn-clean').addEventListener('click',async()=>{const t=$('#raw-input').value.trim();if(!t){$('#clean-status').textContent='请先粘贴英文内容';return}const b=$('#btn-clean');b.disabled=true;$('#clean-status').textContent='AI 正在整理…';$('#clean-status').className='status';try{const out=await ai([{role:'system',content:'清理英文网页内容，删除导航、广告、评论、版权声明；保留标题、原文、段落、句子和引号，不要总结、翻译或改写，只返回正文。'},{role:'user',content:t}],{temperature:.1,maxTokens:10000});if(!out.trim())throw Error('没有提取到正文');$('#clean-status').textContent='整理完成';$('#clean-status').className='status ok';$('#clean-stats').textContent=out.split(/\s+/).length+' words · '+out.length+' characters';pasteArticle(out)}catch(e){$('#clean-status').textContent=e.message;$('#clean-status').className='status bad'}finally{b.disabled=false}});
$('#raw-input').addEventListener('input',()=>$('#input-counter').textContent=$('#raw-input').value.length.toLocaleString()+' / 120,000');$('#btn-clear-input').addEventListener('click',()=>{$('#raw-input').value='';$('#input-counter').textContent='0 / 120,000';$('#clean-status').textContent='';$('#clean-stats').textContent=''});
function quizValid(d,n){const a=Array.isArray(d.questions)?d.questions:[];if(a.length!==n)throw Error('模型返回 '+a.length+' 题，但设定为 '+n+' 题；数量不符，不保存。');const qs=a.map(x=>({question:String(x.question||'').trim(),options:Array.isArray(x.options)?x.options.slice(0,4).map(String):[],correctIndex:Number(x.correctIndex),explanation:String(x.explanation||''),evidence:String(x.evidence||''),selected:null,checked:false}));if(qs.some(x=>!x.question||x.options.length!==4||!Number.isInteger(x.correctIndex)||x.correctIndex<0||x.correctIndex>3))throw Error('选择题格式不完整，每题必须有四个选项和一个正确答案。');return qs}
$('#btn-gen-q').addEventListener('click',async()=>{if(!S.article){await notify('请先导入文章，或从 NEWS 打开内容。');return}const n=Math.max(1,Math.min(20,parseInt($('#q-count').value,10)||5));$('#q-count').value=n;const b=$('#btn-gen-q');b.disabled=true;$('#q-status').textContent='正在生成 '+n+' 道选择题…';$('#q-status').className='status';const prompt='必须精确生成 '+n+' 道四选一阅读理解选择题，不得多或少。四个选项且唯一正确答案，覆盖主旨、细节、推断、词义。问题/选项用英文，解析用简体中文。evidence逐字复制文章中的完整原句。只输出JSON：{"questions":[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"...","evidence":"..."}]}。不得生成简答题。';try{let ok=null,err=null;for(let i=0;i<2;i++){const raw=await ai([{role:'system',content:prompt},{role:'user',content:'文章：\n'+S.article+'\n'+(i?'重新生成，确保恰好 '+n+' 道，四个选项。':'严格按要求生成。')}],{json:true,temperature:.15,maxTokens:Math.min(12000,n*550+1000)});try{ok=quizValid(parse(raw),n);err=null;break}catch(e){err=e}}if(err)throw err;S.questions=ok;put(K.questions,ok);renderQuestions();$('#q-status').textContent='已生成 '+n+' 道选择题';$('#q-status').className='status ok'}catch(e){$('#q-status').textContent=e.message;$('#q-status').className='status bad'}finally{b.disabled=false}});
function renderQuestions(){const box=$('#questions');box.innerHTML='';if(!S.questions.length){box.innerHTML='<div class="empty-state">暂无题目。先准备文章，再生成选择题。</div>';return}S.questions.forEach((q,i)=>{let h='<div class="question-number">QUESTION '+(i+1)+' / '+S.questions.length+'</div><div class="question-prompt">'+esc(q.question)+'</div><div class="question-options">';q.options.forEach((o,j)=>{const sel=q.selected===j,good=q.checked&&j===q.correctIndex,bad=q.checked&&sel&&!good;h+='<button class="option-btn '+(sel?'selected ':'')+(good?'correct ':'')+(bad?'wrong':'')+'" data-q="'+i+'" data-option="'+j+'"><span class="option-key">'+String.fromCharCode(65+j)+'</span><span>'+esc(o)+'</span></button>'});h+='</div><div class="question-foot"><span class="question-feedback '+(q.checked?(q.selected===q.correctIndex?'good':'bad'):'')+'">'+(q.checked?(q.selected===q.correctIndex?'回答正确 · ':'回答不正确 · ')+esc(q.explanation):'选择答案后自动校验')+'</span><button class="btn subtle" data-evidence="'+i+'">查看原文依据</button></div>';const c=document.createElement('section');c.className='question-card';c.innerHTML=h;box.appendChild(c)});$$('[data-option]').forEach(b=>b.addEventListener('click',()=>{const q=S.questions[Number(b.dataset.q)];q.selected=Number(b.dataset.option);q.checked=true;put(K.questions,S.questions);renderQuestions()}));$$('[data-evidence]').forEach(b=>b.addEventListener('click',()=>{const q=S.questions[Number(b.dataset.evidence)];if(!q.evidence)return;const a=S.current||{id:'quiz-article',title:'阅读文章',content:S.article};a.highlight=q.evidence;openArticle(a);setTimeout(()=>{const m=$('#article-body mark');if(m)m.scrollIntoView({block:'center',behavior:'smooth'})},80)}))}
const pop=$('#selection-popup');let pending='';
function hidePop(){pop.style.display='none';pending='';$('#pop-meaning').hidden=true;$('#pop-meaning').textContent=''}
function showPop(rect,v){pending=v;$('#pop-meaning').hidden=true;$('#pop-meaning').textContent='';pop.style.display='block';requestAnimationFrame(()=>{const w=pop.offsetWidth,h=pop.offsetHeight,l=Math.max(10,Math.min(rect.left,innerWidth-w-10));let t=rect.top-h-7;if(t<5)t=Math.min(innerHeight-h-8,rect.bottom+7);if(t+h>innerHeight-8)t=Math.max(5,innerHeight-h-8);pop.style.left=l+'px';pop.style.top=t+'px'})}
function selection(){setTimeout(()=>{const s=window.getSelection(),v=s?s.toString().trim():'';if(!v||v.length>80||!s.rangeCount||!$('#article-body').contains(s.getRangeAt(0).commonAncestorContainer)){hidePop();return}showPop(s.getRangeAt(0).getBoundingClientRect(),v)},35)}
$('#article-body').addEventListener('mouseup',selection);$('#article-body').addEventListener('touchend',selection);$('#pop-close').addEventListener('click',hidePop);document.addEventListener('pointerdown',e=>{if(!pop.contains(e.target)&&!$('#article-body').contains(e.target))hidePop()});
$('#pop-add').addEventListener('click',()=>{const v=pending.trim();if(v&&!S.words.some(w=>String(w).toLowerCase()===v.toLowerCase())){S.words.push(v);put(K.words,S.words);renderWords()}hidePop()});
$('#pop-lookup').addEventListener('click',async()=>{if(!pending)return;const m=$('#pop-meaning');m.hidden=false;m.textContent='查询中…';try{m.textContent=await ai([{role:'system',content:'你是英汉词典，结合语境简洁输出词形、音标、词性、中文释义，限60字。'},{role:'user',content:pending}],{temperature:0,maxTokens:180})}catch(e){m.textContent='查询失败：'+e.message}});
$('#btn-speak').innerHTML=icon('speak');$('#btn-stop-speak').innerHTML=icon('stop');
function speak(){if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)){notify('当前浏览器不支持朗读，请使用最新版 Safari。');return}if(!S.current)return;window.speechSynthesis.cancel();const t=[S.current.title,S.current.summary,S.current.content||''].filter(Boolean).join('\n\n').slice(0,30000),parts=splitP(t);parts.forEach((p,i)=>{const u=new SpeechSynthesisUtterance(p),zh=(p.match(/[\u4e00-\u9fff]/g)||[]).length,en=(p.match(/[A-Za-z]/g)||[]).length;u.lang=zh>en*.15?'zh-CN':'en-US';u.rate=.94;if(i===parts.length-1){u.onend=()=>$('#btn-speak').classList.remove('active');u.onerror=()=>$('#btn-speak').classList.remove('active')}window.speechSynthesis.speak(u)});$('#btn-speak').classList.add('active')}
$('#btn-speak').addEventListener('click',speak);$('#btn-stop-speak').addEventListener('click',()=>{if('speechSynthesis'in window)window.speechSynthesis.cancel();$('#btn-speak').classList.remove('active')});
$('#btn-save-settings').addEventListener('click',()=>{const k=$('#api-key').value.trim(),b=$('#base-url').value.trim()||'https://api.deepseek.com';try{const u=new URL(b);if(!['http:','https:'].includes(u.protocol))throw Error()}catch(e){$('#save-status').textContent='接口地址无效';$('#save-status').className='status bad';return}S.api=k;S.base=b.replace(/\/+$/,'');const ok=put(K.api,k)&&put(K.base,S.base)&&put(K.model,S.model);$('#save-status').textContent=ok?'设置已保存':'保存失败';$('#save-status').className='status '+(ok?'ok':'bad')});
$('#api-key').value=S.api;$('#base-url').value=S.base;$('#model-trigger').innerHTML=esc(S.model)+' <span>⌄</span>';
$('#btn-reset-stats').addEventListener('click',async()=>{if(await notify('确定清空 Token 使用统计吗？')){S.stats={calls:0,prompt:0,completion:0,total:0};put(K.stats,S.stats);renderStats()}});
$('#btn-copy-words').addEventListener('click',async()=>{const v=S.words.join(', ');if(!v){await notify('生词本目前为空。');return}try{await navigator.clipboard.writeText(v)}catch(e){const t=document.createElement('textarea');t.value=v;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}$('#btn-copy-words').textContent='已复制';setTimeout(()=>$('#btn-copy-words').textContent='复制',1300)});
if(S.current&&typeof S.current==='object'){S.article=S.current.content||S.current.originalText||S.article;reader()}else if(S.article){S.current={id:'stored',title:'上次阅读文章',content:S.article};reader()}
S.font=Math.max(minFont(),Math.min(34,S.font));setFont(S.font);renderStats();renderWords();renderQuestions();renderFavorites();channel('china');
})();