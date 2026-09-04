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

  function sendPageview() {
    const route = normalizedRoute();
    if (!validRoute(route) || route === lastRoute) return;
    lastRoute = route;

    const payload = JSON.stringify({
      route,
      path: location.pathname,
      title: document.title
    });

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon(endpoint(), blob)) return;
      }
    } catch (error) {
      console.debug('Pageview beacon unavailable', error);
    }

    fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
      credentials: 'omit'
    }).catch(() => {});
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
