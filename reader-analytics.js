(() => {
  const VERCEL_GATEWAY = 'https://path-notes-private-gateway.vercel.app';
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

  async function sendPageview() {
    const route = normalizedRoute();
    if (!validRoute(route) || route === lastRoute) return;

    const payload = JSON.stringify({
      route,
      path: location.pathname,
      title: document.title,
      readingMode: readingMode(),
      uiLocale: uiLocale(),
      referrer: document.referrer || ''
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
