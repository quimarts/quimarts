// v6 - force fresh install
const CACHE = 'quimarts-v6'
const BASE = '/quimarts/'

self.addEventListener('install', e => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Supabase - always network
  if (url.hostname.includes('supabase.co')) {
    if (e.request.method !== 'GET') {
      e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}',{headers:{'Content-Type':'application/json'}})))
      return
    }
    e.respondWith(
      fetch(e.request.clone()).then(res => {
        if(res.ok){const c=res.clone();caches.open(CACHE).then(ca=>ca.put(e.request,c))}
        return res
      }).catch(()=>caches.match(e.request).then(c=>c||new Response('[]',{headers:{'Content-Type':'application/json'}})))
    )
    return
  }

  // CDN - cache first
  if(!url.hostname.includes('github.io')){
    e.respondWith(
      caches.match(e.request).then(c=>c||fetch(e.request).then(res=>{
        if(res.ok){const cl=res.clone();caches.open(CACHE).then(ca=>ca.put(e.request,cl))}
        return res
      }))
    )
    return
  }

  // App - ALWAYS network first, no cache fallback for HTML
  e.respondWith(
    fetch(e.request, {cache:'no-store'})
      .then(res => {
        if(res.ok && !url.pathname.endsWith('.html')){
          const c=res.clone();caches.open(CACHE).then(ca=>ca.put(e.request,c))
        }
        return res
      })
      .catch(()=>caches.match(e.request))
  )
})
