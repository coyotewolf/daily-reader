const LINE_HEIGHT_MIN = 1.35;
const LINE_HEIGHT_MAX = 2.15;
const LINE_HEIGHT_STEP = 0.1;
const READER_CHROME_HIDE_DELAY = 4200;
const READER_CONTROL_HOLD_MS = 4200;

function readSavedLineHeight() {
  const saved = Number(localStorage.getItem("pathnotes-line-height") ?? "1.85");
  if (!Number.isFinite(saved)) return 1.85;
  return Math.min(LINE_HEIGHT_MAX, Math.max(LINE_HEIGHT_MIN, saved));
}

let readerLineHeight = readSavedLineHeight();
let readerChromeTimer = null;
let readerChromeHoldUntil = 0;
let readerChromeScrollAnchor = window.scrollY;

function lineHeightLocaleText(kind) {
  const locale = state?.uiLocale || "en";
  const table = {
    en: { down:"Decrease line spacing", up:"Increase line spacing", previous:"← Previous chapter", next:"Next chapter →", contents:"Back to contents" },
    "zh-Hant": { down:"縮小行距", up:"放大行距", previous:"← 上一章", next:"下一章 →", contents:"回到目錄" },
    "zh-Hans": { down:"缩小行距", up:"放大行距", previous:"← 上一章", next:"下一章 →", contents:"返回目录" }
  };
  return (table[locale] || table.en)[kind];
}

function applyReaderLineHeight() {
  document.documentElement.style.setProperty("--reader-line-height", readerLineHeight.toFixed(2));
  const label=document.querySelector("#lineHeightLabel"); if(label) label.textContent=readerLineHeight.toFixed(2).replace(/0$/,"");
  const down=document.querySelector("#lineHeightDown"), up=document.querySelector("#lineHeightUp");
  if(down){down.setAttribute("aria-label",lineHeightLocaleText("down"));down.title=lineHeightLocaleText("down");down.disabled=readerLineHeight<=LINE_HEIGHT_MIN+.001;}
  if(up){up.setAttribute("aria-label",lineHeightLocaleText("up"));up.title=lineHeightLocaleText("up");up.disabled=readerLineHeight>=LINE_HEIGHT_MAX-.001;}
}

function changeReaderLineHeight(delta) {
  readerLineHeight=Math.round((readerLineHeight+delta)*100)/100;
  readerLineHeight=Math.min(LINE_HEIGHT_MAX,Math.max(LINE_HEIGHT_MIN,readerLineHeight));
  localStorage.setItem("pathnotes-line-height",String(readerLineHeight)); applyReaderLineHeight();
}

function chapterHref(book,chapter){return `#/book/${encodeURIComponent(book.slug)}/story/${encodeURIComponent(chapter.slug)}`;}
function contentsHref(book){return `#/book/${encodeURIComponent(book.slug)}`;}

function addFooterChapterNavigation(bookSlug,storySlug){
  const reader=document.querySelector(".reader"); if(!reader)return;
  const book=findBook(bookSlug); if(!book)return;
  const chapters=[...(book.chapters||[])].sort((a,b)=>Number(a.episode)-Number(b.episode));
  const index=chapters.findIndex(c=>c.slug===storySlug); if(index<0)return;
  const previous=index>0?chapters[index-1]:null, next=index<chapters.length-1?chapters[index+1]:null;
  const footer=reader.querySelector(".story-footer"); if(!footer)return;
  footer.classList.add("chapter-footer"); footer.replaceChildren();
  const nav=document.createElement("nav"); nav.className="footer-chapter-nav"; nav.setAttribute("aria-label",state.uiLocale==="en"?"Chapter navigation":"章節導覽");
  const makeChapter=(chapter,kind)=>{const a=document.createElement("a");a.className=`soft-button footer-chapter-button ${kind}`;a.href=chapterHref(book,chapter);a.textContent=lineHeightLocaleText(kind);return a;};
  const makeContents=(kind)=>{const a=document.createElement("a");a.className=`soft-button footer-chapter-button contents ${kind}`;a.href=contentsHref(book);a.textContent=lineHeightLocaleText("contents");return a;};

  // First chapter: Back to contents | Next chapter.
  // Last chapter: Previous chapter | Back to contents.
  nav.appendChild(previous ? makeChapter(previous,"previous") : makeContents("previous"));
  nav.appendChild(next ? makeChapter(next,"next") : makeContents("next"));
  footer.appendChild(nav);
}

function clearReaderChromeTimer(){if(readerChromeTimer!==null){clearTimeout(readerChromeTimer);readerChromeTimer=null;}}
function isActualReaderPage(){return document.body.classList.contains("is-reader")&&Boolean(document.querySelector(".reader"));}
function chromeIsHeld(){return Date.now()<readerChromeHoldUntil;}
function holdReaderChrome(duration=READER_CONTROL_HOLD_MS){readerChromeHoldUntil=Date.now()+duration;readerChromeScrollAnchor=window.scrollY;}
function hideReaderChrome(force=false){
  if(!isActualReaderPage())return;
  if(!force&&chromeIsHeld())return;
  clearReaderChromeTimer();
  readerChromeHoldUntil=0;
  document.body.classList.add("reader-chrome-hidden");
}
function scheduleReaderChromeHide(delay=READER_CHROME_HIDE_DELAY){
  clearReaderChromeTimer(); if(!isActualReaderPage())return;
  const remaining=Math.max(0,readerChromeHoldUntil-Date.now());
  const actualDelay=Math.max(delay,remaining);
  readerChromeTimer=setTimeout(()=>{if(isActualReaderPage()&&!chromeIsHeld())hideReaderChrome(true);},actualDelay);
}
function showReaderChrome(autoHide=true,hold=false){
  if(!isActualReaderPage())return;
  document.body.classList.remove("reader-chrome-hidden");
  if(hold) holdReaderChrome();
  if(autoHide)scheduleReaderChromeHide();
}
function isReaderChromeInteractiveTarget(target){return Boolean(target?.closest?.(".topbar, .reader-tools, a, button, input, select, textarea, .lookup-word, .word-popup"));}

function syncReaderEnhancements(){
  applyReaderLineHeight();
  const match=location.hash.match(/^#\/book\/([^/]+)\/story\/(.+)$/);
  if(match&&document.querySelector(".reader")){
    addFooterChapterNavigation(decodeURIComponent(match[1]),decodeURIComponent(match[2]));
    readerChromeHoldUntil=0;
    readerChromeScrollAnchor=window.scrollY;
    document.body.classList.remove("reader-chrome-hidden"); scheduleReaderChromeHide();
  } else {clearReaderChromeTimer();readerChromeHoldUntil=0;document.body.classList.remove("reader-chrome-hidden");}
}

function keepChromeAfterControl(){
  showReaderChrome(true,true);
}

document.querySelector("#lineHeightDown")?.addEventListener("click",()=>{changeReaderLineHeight(-LINE_HEIGHT_STEP);keepChromeAfterControl();});
document.querySelector("#lineHeightUp")?.addEventListener("click",()=>{changeReaderLineHeight(LINE_HEIGHT_STEP);keepChromeAfterControl();});

// Any interaction with the bottom bar holds it open. The hold is cancelled by
// a real reading scroll, not by tiny focus/layout scrolls caused by tapping.
document.querySelector(".reader-tools")?.addEventListener("pointerdown",()=>{showReaderChrome(false,true);},true);
document.querySelector(".reader-tools")?.addEventListener("click",()=>{keepChromeAfterControl();},true);

document.addEventListener("click",event=>{
  if(!isActualReaderPage())return;
  if(event.target?.closest?.(".reader-tools")) return;
  if(isReaderChromeInteractiveTarget(event.target)){if(!document.body.classList.contains("reader-chrome-hidden"))scheduleReaderChromeHide();return;}
  showReaderChrome(true);
},true);

window.addEventListener("scroll",()=>{
  if(!isActualReaderPage())return;
  const moved=Math.abs(window.scrollY-readerChromeScrollAnchor);
  if(moved>12){readerChromeScrollAnchor=window.scrollY;hideReaderChrome(true);}
},{passive:true});

document.addEventListener("touchmove",event=>{
  if(!isActualReaderPage())return;
  if(event.target?.closest?.(".reader-tools"))return;
  hideReaderChrome(true);
},{passive:true});

const readerObserver=new MutationObserver(()=>requestAnimationFrame(syncReaderEnhancements));
readerObserver.observe(document.querySelector("#app"),{childList:true,subtree:false});
window.addEventListener("hashchange",()=>requestAnimationFrame(syncReaderEnhancements));
applyReaderLineHeight(); requestAnimationFrame(syncReaderEnhancements);
