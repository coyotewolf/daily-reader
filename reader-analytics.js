(() => {
  const VERCEL_GATEWAY = 'https://path-notes-private-gateway.vercel.app';
  const READER_KEY = 'pathnotes-reader-id';
  const SESSION_KEY = 'pathnotes-session-id';
  let lastRoute = null;

  function endpoint() {
    return location.hostname === 'coyotewolf.github.io'
      ? `${VERCEL_GATEWAY}/api/pageview`
      : `${location.origin}/api/pageview`;
  }

  function normalizedRoute() {
    const route = location.hash || '#/';
    if (route === '#') return '#/';
    return route;
  }

  function validRoute(route) {
    return route === '#/' || /^#\/book\/[^\s#?]+(?:\/story\/[^\s#?]+)?$/.test(route);
  }

  function readingMode() {
    const value = localStorage.getItem('pathnotes-language') || 'both';
    return ['en', 'zh', 'both'].includes(value) ? value : 'both';
  }

  function uiLocale() {
    return document.documentElement.lang || navigator.language || '';
  }

  function makeId(prefix) {
    if (globalThis.crypto?.randomUUID) return `${prefix}:${crypto.randomUUID()}`;
    return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
  }

  function persistentReaderId() {
    try {
      let value = localStorage.getItem(READER_KEY);
      if (!value) {
        value = makeId('r');
        localStorage.setItem(READER_KEY, value);
      }
      return value;
    } catch {
      return makeId('r');
    }
  }

  function sessionId() {
    try {
      let value = sessionStorage.getItem(SESSION_KEY);
      if (!value) {
        value = makeId('s');
        sessionStorage.setItem(SESSION_KEY, value);
      }
      return value;
    } catch {
      return makeId('s');
    }
  }

  function displayMode() {
    if (window.matchMedia?.('(display-mode: fullscreen)').matches) return 'fullscreen';
    if (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true) return 'standalone';
    if (window.matchMedia?.('(display-mode: minimal-ui)').matches) return 'minimal-ui';
    return 'browser';
  }

  const readerId = persistentReaderId();
  const currentSessionId = sessionId();

  async function sendPageview() {
    const route = normalizedRoute();
    if (!validRoute(route) || route === lastRoute) return;

    const payload = JSON.stringify({
      route,
      path: location.pathname,
      title: document.title,
      readingMode: readingMode(),
      uiLocale: uiLocale(),
      referrer: document.referrer || '',
      readerId,
      sessionId: currentSessionId,
      displayMode: displayMode()
    });

    try {
      const response = await fetch(endpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: payload,
        keepalive: true,
        credentials: 'omit',
        mode: 'cors'
      });

      if (!response.ok && response.status !== 204) {
        console.debug('Pageview request failed', response.status);
        return;
      }

      lastRoute = route;
    } catch (error) {
      console.debug('Pageview request failed', error);
    }
  }

  function schedulePageview() {
    setTimeout(sendPageview, 0);
  }

  window.addEventListener('hashchange', schedulePageview);
  window.addEventListener('pageshow', schedulePageview);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedulePageview, { once: true });
  } else {
    schedulePageview();
  }
})();
