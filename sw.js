const CACHE_APP = 'quimarts-app-v3'
const CACHE_DATA = 'quimarts-data-v3'
const BASE = '/quimarts/'

// Assets de la app a cachear siempre
const APP_ASSETS = [BASE, BASE + 'index.html']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_APP)
      .then(c => c.addAll(APP_ASSETS))
      .catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_APP && k !== CACHE_DATA)
          .map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // ── Supabase API: network first, cache fallback ──
  if (url.hostname.includes('supabase.co')) {
    // Solo cacheamos GETs
    if (e.request.method !== 'GET') {
      e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', {headers:{'Content-Type':'application/json'}})))
      return
    }
    e.respondWith(
      fetch(e.request.clone())
        .then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_DATA).then(c => c.put(e.request, clone))
          }
          return res
        })
        .catch(() => caches.match(e.request).then(cached => {
          if (cached) return cached
          return new Response('{"error":"offline","data":[]}', {
            headers: {'Content-Type': 'application/json'}
          })
        }))
    )
    return
  }

  // ── CDN (Supabase JS, jsPDF, fonts): cache first ──
  if (url.hostname.includes('cdn.') || url.hostname.includes('cdnjs.') ||
      url.hostname.includes('jsdelivr') || url.hostname.includes('googleapis') ||
      url.hostname.includes('gstatic')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached
        return fetch(e.request).then(res => {
          const clone = res.clone()
          caches.open(CACHE_APP).then(c => c.put(e.request, clone))
          return res
        })
      })
    )
    return
  }

  // ── App shell: cache first, network update en segundo plano ──
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_APP).then(c => c.put(e.request, clone))
        }
        return res
      }).catch(() => null)

      return cached || networkFetch || caches.match(BASE + 'index.html')
    })
  )
})
