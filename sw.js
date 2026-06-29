const CACHE = 'quimarts-v2'
const BASE = '/quimarts/'
const ASSETS = [
  BASE,
  BASE + 'index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([BASE, BASE + 'index.html'])).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Supabase — siempre network, nunca cache
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(fetch(e.request))
    return
  }

  // CDN y fuentes — cache first
  if (url.hostname.includes('cdnjs') || url.hostname.includes('jsdelivr') || url.hostname.includes('googleapis')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
        return res
      }))
    )
    return
  }

  // App — network first, fallback a cache (para que siempre cargue el index)
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match(BASE + 'index.html')))
  )
})
