(() => {
  const GATEWAY_BASE = 'https://path-notes-private-gateway.vercel.app';
  const fallbackFetchWordTranslation = fetchWordTranslation;

  fetchWordTranslation = async function fetchWordTranslationViaGateway(word) {
    const local = localWordTranslation(word);
    if (local) return local;

    const cache = readTranslationCache();
    const key = cacheKeyForWord(word);
    if (cache[key]) return cache[key];

    const target = state.uiLocale === 'zh-Hans' ? 'zh-CN' : 'zh-TW';
    const url = new URL('/api/translate', GATEWAY_BASE);
    url.searchParams.set('word', word);
    url.searchParams.set('target', target);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5500);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`Gateway HTTP ${response.status}`);
      const data = await response.json();
      const translated = String(data?.translation || '').trim();
      if (!translated) throw new Error('No gateway translation');

      cache[key] = translated;
      writeTranslationCache(cache);
      return translated;
    } catch (error) {
      console.warn('Private translation gateway unavailable; using direct fallback.', error);
      return fallbackFetchWordTranslation(word);
    } finally {
      clearTimeout(timer);
    }
  };
})();
