const CACHE_APP = 'quimarts-app-v5'
const CACHE_DATA = 'quimarts-data-v5'
const BASE = '/quimarts/'

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_APP)
      .then(c => c.addAll([BASE, BASE + 'index.html']))
      .catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_APP && k !== CACHE_DATA).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  if (url.hostname.includes('supabase.co')) {
    if (e.request.method !== 'GET') {
      e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', {headers:{'Content-Type':'application/json'}})))
      return
    }
    e.respondWith(
      fetch(e.request.clone())
        .then(res => {
          if (res.ok) { const clone = res.clone(); caches.open(CACHE_DATA).then(c => c.put(e.request, clone)) }
          return res
        })
        .catch(() => caches.match(e.request).then(cached => cached || new Response('{"error":"offline","data":[]}', {headers:{'Content-Type':'application/json'}})))
    )
    return
  }

  if (url.hostname.includes('cdn.') || url.hostname.includes('cdnjs.') || url.hostname.includes('jsdelivr') || url.hostname.includes('googleapis') || url.hostname.includes('gstatic')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone()
        caches.open(CACHE_APP).then(c => c.put(e.request, clone))
        return res
      }))
    )
    return
  }

  // App shell: NETWORK FIRST para siempre tener la última versión
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE_APP).then(c => c.put(e.request, clone)) }
        return res
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match(BASE + 'index.html')))
  )
})
