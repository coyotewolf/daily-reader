// Paired bilingual renderer ---------------------------------------------------
function cleanStoryText(text) {
  return String(text || "").replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/\n{2,}/g, "\n").trim();
}

function splitEnglishSentences(text) {
  const value = cleanStoryText(text);
  if (!value) return [];
  if (typeof Intl.Segmenter === "function") {
    try { return [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(value)].map(x => cleanStoryText(x.segment)).filter(Boolean); } catch {}
  }
  return value.match(/[^.!?]+(?:[.!?]+[”"']*|$)/g)?.map(cleanStoryText).filter(Boolean) || [value];
}

function splitChineseSentences(text) {
  const value = cleanStoryText(text);
  if (!value) return [];
  return value.match(/[^。！？!?]+(?:[。！？!?]+[」』”"']*|$)/g)?.map(cleanStoryText).filter(Boolean) || [value];
}

function expandPairToSentencePairs(pair) {
  const en = cleanStoryText(pair?.en), zh = cleanStoryText(pair?.zh);
  if (!en && !zh) return [];
  const es = splitEnglishSentences(en), zs = splitChineseSentences(zh);
  if (es.length > 1 && es.length === zs.length) return es.map((s,i)=>({en:s,zh:zs[i]}));
  return [{ en, zh }];
}

function textLen(value) { return Math.max(1, cleanStoryText(value).replace(/\s+/g, "").length); }
const ALIGN_NAMES = ["geralt","tomas","edda","visenna","ilse","aven","lena","holt","marek","pavel","marta","yennefer","vesemir","roach","ciri","cintra","oxenfurt","ravelin","pontar","kaer morhen","elder blood","raven","seren"];
function alignmentSignature(value) {
  const text = cleanStoryText(value), lower = text.toLowerCase();
  return { names: new Set(ALIGN_NAMES.filter(n => lower.includes(n))), quote: /^[“"「『]/.test(text), q: /[?？]/.test(text), e: /[!！]/.test(text) };
}
function symmetricNameDifference(a,b) { let n=0; a.forEach(x=>{if(!b.has(x))n++}); b.forEach(x=>{if(!a.has(x))n++}); return n; }

// Banded dynamic-programming alignment. It handles 1↔2 and occasional 1↔3
// translation splits without letting one extra Chinese sentence shift the
// remainder of the chapter.
function alignParallelStoryArrays(en, zh) {
  if (!en.length || !zh.length) return en.map((x,i)=>({en:x,zh:zh[i]||""}));
  const ratio = zh.reduce((s,x)=>s+textLen(x),0) / en.reduce((s,x)=>s+textLen(x),0);
  const n=en.length, m=zh.length, band=20;
  const rows = Array.from({length:n+1},()=>new Map());
  rows[0].set(0,{cost:0,prev:null});
  const moves=[[1,1],[1,2],[2,1],[2,2],[1,3],[3,1]];
  for(let i=0;i<=n;i++) {
    for(const [j,node] of rows[i]) {
      for(const [a,b] of moves) {
        const ni=i+a,nj=j+b; if(ni>n||nj>m) continue;
        if(Math.abs(nj-(ni*m/n))>band) continue;
        const es=en.slice(i,ni).join(" "), zs=zh.slice(j,nj).join(" ");
        const le=textLen(es), lz=textLen(zs), se=alignmentSignature(es), sz=alignmentSignature(zs);
        let c=Math.abs(Math.log((lz/le)/ratio))*1.8 + symmetricNameDifference(se.names,sz.names)*.65;
        c += (se.quote!==sz.quote)*.35 + (se.q!==sz.q)*.18 + (se.e!==sz.e)*.12 + .20*(a+b-2);
        const old=rows[ni].get(nj), total=node.cost+c;
        if(!old||total<old.cost) rows[ni].set(nj,{cost:total,prev:[i,j]});
      }
    }
  }
  if(!rows[n].has(m)) return en.map((x,i)=>({en:x,zh:zh[i]||""}));
  const result=[]; let i=n,j=m;
  while(i||j){ const prev=rows[i].get(j).prev; const [pi,pj]=prev; result.push({en:en.slice(pi,i).join(" "),zh:zh.slice(pj,j).join(" ")}); i=pi;j=pj; }
  return result.reverse();
}

function storyPairs(story) {
  if (Array.isArray(story.content?.pairs) && story.content.pairs.length) return story.content.pairs.flatMap(expandPairToSentencePairs).filter(p=>cleanStoryText(p.en)||cleanStoryText(p.zh));
  const en=(story.content?.en||story.paragraphs?.map(p=>p.en).filter(Boolean)||[]).map(cleanStoryText).filter(Boolean);
  const zh=(story.content?.zh||story.paragraphs?.map(p=>p.zh).filter(Boolean)||[]).map(cleanStoryText).filter(Boolean);
  return alignParallelStoryArrays(en,zh).flatMap(expandPairToSentencePairs).filter(p=>p.en||p.zh);
}
function isDialoguePair(pair){ return /^[“"「『]/.test(cleanStoryText(pair?.en||pair?.zh)); }

renderStory = async function renderStoryPaired(bookSlug, storySlug) {
  const book=findBook(bookSlug); if(!book) return renderNotFound("bookNotFound");
  const story=book.chapters.find(x=>x.slug===storySlug); if(!story) return renderNotFound("chapterNotFound");
  try { await ensureStoryContent(story); } catch(error){ console.error("Unable to load story content:",error); return renderNotFound("chapterNotFound"); }
  setReaderMode(true); state.activeStory=story;
  const fragment=document.querySelector("#readerTemplate").content.cloneNode(true); translateTree(fragment);
  fragment.querySelector("#backToBook").href=`#/book/${encodeURIComponent(book.slug)}`;
  const footerBack=fragment.querySelector("#footerBackToBook"); if(footerBack) footerBack.href=`#/book/${encodeURIComponent(book.slug)}`;
  const publishedAt=chapterDate(story);
  fragment.querySelector("#storyMeta").textContent=`${t("chapterNumber",{n:story.episode})} · ${t("publishedOn",{date:formatDate(publishedAt)})}`;
  fragment.querySelector("#storyTitleEn").innerHTML=tokenizeEnglish(story.title?.en||"");
  fragment.querySelector("#storyTitleZh").textContent=story.title?.zh||story.title?.zhHant||"";
  fragment.querySelector("#storyRecapEn").innerHTML=tokenizeEnglish(story.recap?.en||"");
  fragment.querySelector("#storyRecapZh").textContent=story.recap?.zh||story.recap?.zhHant||"";
  const hint=fragment.querySelector(".word-hint"); if(hint&&typeof contextualHintText==="function") hint.textContent=contextualHintText();
  const body=fragment.querySelector("#storyBody"); body.replaceChildren();
  storyPairs(story).forEach((pair,index)=>{
    const enText=cleanStoryText(pair.en), zhText=cleanStoryText(pair.zh); if(!enText&&!zhText)return;
    const wrap=document.createElement("div"); wrap.className=`story-pair${isDialoguePair(pair)?" dialogue":""}`; wrap.dataset.pairIndex=String(index);
    if(enText){const p=document.createElement("p");p.className="en content-en";p.lang="en";p.innerHTML=tokenizeEnglish(enText);wrap.appendChild(p);}
    if(zhText){const p=document.createElement("p");p.className="zh content-zh";p.lang="zh-Hant";p.textContent=zhText;wrap.appendChild(p);}
    body.appendChild(wrap);
  });
  app.replaceChildren(fragment); document.title=`${localizedValue(story.title)} | ${localizedValue(book.title)}`; window.scrollTo({top:0});
};