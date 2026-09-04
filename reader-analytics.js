(() => {
  const VERCEL_GATEWAY = 'https://path-notes-private-gateway.vercel.app';
  const READER_KEY = 'pathnotes-reader-id';
  const SESSION_KEY = 'pathnotes-session-id';
  const ENGAGEMENT_INTERVAL_MS = 30000;
  let lastRoute = null;
  let activeChapter = null;
  let engagementStartedAt = null;
  let completionSentFor = null;
  let lastLookupSignature = null;

  function apiBase() {
    return location.hostname === 'coyotewolf.github.io' ? VERCEL_GATEWAY : location.origin;
  }
  function normalizedRoute() { const route = location.hash || '#/'; return route === '#' ? '#/' : route; }
  function validRoute(route) { return route === '#/' || /^#\/book\/[^\s#?]+(?:\/story\/[^\s#?]+)?$/.test(route); }
  function routeParts(route = normalizedRoute()) {
    const match = route.match(/^#\/book\/([^\s#?\/]+)(?:\/story\/([^\s#?\/]+))?$/);
    return { bookSlug: match?.[1] ? decodeURIComponent(match[1]) : null, chapterSlug: match?.[2] ? decodeURIComponent(match[2]) : null };
  }
  function readingMode() { const value = localStorage.getItem('pathnotes-language') || 'both'; return ['en','zh','both'].includes(value) ? value : 'both'; }
  function uiLocale() { return document.documentElement.lang || navigator.language || ''; }
  function displayMode() {
    if (window.matchMedia?.('(display-mode: fullscreen)').matches) return 'fullscreen';
    if (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true) return 'standalone';
    if (window.matchMedia?.('(display-mode: minimal-ui)').matches) return 'minimal-ui';
    return 'browser';
  }
  function makeId(prefix) { if (globalThis.crypto?.randomUUID) return `${prefix}:${crypto.randomUUID()}`; return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`; }
  function persistentReaderId() { try { let value=localStorage.getItem(READER_KEY); if(!value){value=makeId('r');localStorage.setItem(READER_KEY,value)} return value; } catch { return makeId('r'); } }
  function sessionId() { try { let value=sessionStorage.getItem(SESSION_KEY); if(!value){value=makeId('s');sessionStorage.setItem(SESSION_KEY,value)} return value; } catch { return makeId('s'); } }

  const readerId = persistentReaderId();
  const currentSessionId = sessionId();

  async function post(path, body) {
    try {
      const response = await fetch(`${apiBase()}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(body), keepalive: true, credentials: 'omit', mode: 'cors'
      });
      return response.ok || response.status === 204;
    } catch { return false; }
  }

  async function sendPageview() {
    const route = normalizedRoute();
    if (!validRoute(route) || route === lastRoute) return;
    const ok = await post('/api/pageview', {
      route, path: location.pathname, title: document.title, readingMode: readingMode(), uiLocale: uiLocale(),
      referrer: document.referrer || '', readerId, sessionId: currentSessionId, displayMode: displayMode()
    });
    if (ok) lastRoute = route;
  }

  function sendEvent(event, properties = {}, route = normalizedRoute()) {
    if (!validRoute(route)) return Promise.resolve(false);
    const { bookSlug, chapterSlug } = routeParts(route);
    return post('/api/event', { event, route, bookSlug, chapterSlug, readerId, sessionId: currentSessionId, properties: { ...properties, languageMode: readingMode(), displayMode: displayMode() } });
  }

  function currentProgressPct() {
    const reader = document.querySelector('.reader');
    if (!reader) return 0;
    const rect = reader.getBoundingClientRect();
    const total = Math.max(1, reader.scrollHeight - window.innerHeight * 0.35);
    const progressed = Math.max(0, Math.min(total, -rect.top + window.innerHeight * 0.55));
    return Math.round((progressed / total) * 100);
  }

  function flushEngagement() {
    if (!activeChapter || engagementStartedAt == null || document.visibilityState === 'hidden') return;
    const now = Date.now();
    const seconds = Math.round((now - engagementStartedAt) / 1000);
    engagementStartedAt = now;
    if (seconds < 2) return;
    sendEvent('reader_engagement', { engagedSeconds: Math.min(seconds, 600), progressPct: currentProgressPct() }, activeChapter);
  }

  function updateChapterState() {
    flushEngagement();
    const route = normalizedRoute();
    const { chapterSlug } = routeParts(route);
    if (chapterSlug) {
      if (activeChapter !== route) {
        activeChapter = route;
        engagementStartedAt = document.visibilityState === 'visible' ? Date.now() : null;
        completionSentFor = null;
        sendEvent('chapter_open', { progressPct: currentProgressPct() }, route);
      }
    } else {
      activeChapter = null;
      engagementStartedAt = null;
      completionSentFor = null;
    }
  }

  function maybeComplete() {
    if (!activeChapter || completionSentFor === activeChapter) return;
    const pct = currentProgressPct();
    if (pct >= 90) {
      completionSentFor = activeChapter;
      sendEvent('chapter_complete', { progressPct: pct }, activeChapter);
    }
  }

  function scheduleRouteAnalytics() {
    setTimeout(() => { sendPageview(); updateChapterState(); maybeComplete(); }, 0);
  }

  window.addEventListener('hashchange', scheduleRouteAnalytics);
  window.addEventListener('pageshow', scheduleRouteAnalytics);
  window.addEventListener('scroll', maybeComplete, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEngagement();
      engagementStartedAt = null;
    } else if (activeChapter) {
      engagementStartedAt = Date.now();
    }
  });
  window.addEventListener('pagehide', flushEngagement);
  setInterval(() => { if (document.visibilityState === 'visible') { flushEngagement(); maybeComplete(); } }, ENGAGEMENT_INTERVAL_MS);

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-lang]');
    if (!button) return;
    setTimeout(() => sendEvent('language_change', { languageMode: button.dataset.lang }), 0);
  }, true);

  function observeLookupPopup() {
    const popup = document.querySelector('#wordPopup');
    const source = document.querySelector('#wordPopupSource');
    if (!popup || !source) return;
    const observer = new MutationObserver(() => {
      if (popup.hidden) return;
      const word = String(source.textContent || '').trim().toLowerCase();
      if (!word || !activeChapter) return;
      const signature = `${activeChapter}:${word}`;
      if (signature === lastLookupSignature) return;
      lastLookupSignature = signature;
      sendEvent('dictionary_lookup', { word }, activeChapter);
    });
    observer.observe(popup, { attributes: true, attributeFilter: ['hidden'], childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { scheduleRouteAnalytics(); observeLookupPopup(); }, { once: true });
  } else {
    scheduleRouteAnalytics(); observeLookupPopup();
  }
})();
