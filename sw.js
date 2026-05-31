/* CUBELINK Studio Service Worker v2.8.9
 * 캐시 전략:
 *   - HTML과 sw.js 자체: Network First (항상 최신 시도, 실패 시 캐시)
 *   - CSS/JS/이미지 등 정적 파일: Cache First (빠른 로딩)
 * 업데이트 시 CACHE_VERSION 값을 올려야 사용자에게 새 버전이 적용됩니다.
 */

const CACHE_VERSION = 'cubelink-v2.8.9';

// 앱 설치 시 미리 받아둘 핵심 파일 목록
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/mobile.css',
  './js/app.js',
  './js/blocks.js',
  './js/simulator3D.js',
  './js/mobile-ui.js',
  './js/webserial-polyfill.js',
  './libs/blockly/blockly.min.js',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

// 1. 설치: 핵심 파일들을 캐시에 미리 저장
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// 2. 활성화: 이전 버전 캐시 삭제 (용량 절약)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 3. 요청 처리: HTML/sw.js는 Network First, 나머지는 Cache First
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // GET 요청만 처리
  if (req.method !== 'GET') return;

  // http(s) 외 스킴(chrome-extension:// 등) 무시
  if (!req.url.startsWith('http')) return;

  const url = new URL(req.url);

  // sw.js 자체는 절대 캐시하지 않음 (항상 네트워크에서 받아 새 버전 감지)
  if (url.pathname.endsWith('/sw.js')) {
    event.respondWith(fetch(req));
    return;
  }

  // HTML 요청은 Network First (항상 최신 시도, 실패 시에만 캐시)
  const isHTML = req.mode === 'navigate'
              || (req.headers.get('accept') || '').includes('text/html')
              || url.pathname.endsWith('.html')
              || url.pathname.endsWith('/');

  if (isHTML) {
    event.respondWith(
      fetch(req).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
        }
        return response;
      }).catch(() =>
        caches.match(req).then((cached) => cached || caches.match('./index.html'))
      )
    );
    return;
  }

  // CSS/JS/이미지 등 정적 파일: Cache First (기존 전략 유지)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
        }
        return response;
      }).catch(() => {
        if ((req.headers.get('accept') || '').includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
