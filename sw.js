/* CUBELINK Studio Service Worker v2.8.5
 * 캐시 전략: Cache First (정적 파일)
 * 업데이트 시 CACHE_VERSION 값을 올려야 사용자에게 새 버전이 적용됩니다.
 */

const CACHE_VERSION = 'cubelink-v2.8.6';

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

// 3. 요청 처리: Cache First 전략
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // GET 요청만 처리 (POST 등은 그대로 통과)
  if (req.method !== 'GET') return;

  // chrome-extension:// 등 http(s) 외 스킴은 무시
  if (!req.url.startsWith('http')) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      // 캐시에 있으면 즉시 반환
      if (cached) return cached;

      // 없으면 네트워크에서 가져오고, 성공하면 캐시에 저장
      return fetch(req).then((response) => {
        // 정상 응답만 캐시 (200 OK, 같은 도메인)
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
        }
        return response;
      }).catch(() => {
        // 네트워크 실패 시: HTML 요청이면 index.html이라도 보여주기
        if (req.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
