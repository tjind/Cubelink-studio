# CUBELINK Studio

The Pinnacle of Robot Education - 큐브링크 로봇팔 제어 학습 플랫폼

PWA 데모: https://tjind.github.io/Cubelink-studio/

## 개발 진행 상황 (2026-05-26 기준)

### 완료된 기능
- v2.8.5: PWA 지원 (manifest, sw.js, 아이콘 4종, theme #D4AF37)
- 데스크톱 Web Serial로 CH340 로봇팔 제어
- Blockly 블록 코딩 + 3D 시뮬레이터
- 오프라인 동작 (서비스워커 캐시, 약 1.94 MB)

### 진행 중 (Capacitor Android 빌드 - A안)
- Node.js v24, OpenJDK 25 환경
- @adeunis/capacitor-serial@1.0.6 플러그인 설치 완료
- Android 플랫폼 추가 + USB 권한 설정 완료
- AndroidManifest USB host + device_filter.xml (CH340 등 7종 화이트리스트)
- build-web.ps1 빌드 스크립트로 dist/ 산출물 분리

### 다음 작업 (v2.9.0 목표)
1. webserial-polyfill.js를 @adeunis/capacitor-serial API에 맞춰 수정
2. Android Studio로 첫 APK 빌드 (npx cap open android)
3. 실기기에서 USB-C 젠더 + 로봇 연결 검증
4. 코딩 저장·복구 시스템 구현 (js/storage/workspace-storage.js)
5. 폴더 구조 정리 (app.js → core/, ui/, serial/, storage/)
6. 필요 시 C안(자체 USB 플러그인) 마이그레이션 검토

## 프로젝트 구조

- www/ : 소스 루트 (GitHub Pages = PWA 배포)
- www/dist/ : (gitignored) Capacitor 빌드 산출물
- www/android/ : Capacitor Android 프로젝트
- www/build-web.ps1 : 웹 자산을 dist/로 복사
- www/capacitor.config.ts : Capacitor 설정 (webDir: dist)
- www/node_modules/ : (gitignored)

## 개발 워크플로우

### 데스크톱 PWA 테스트
VS Code에서 Go Live 클릭 → http://127.0.0.1:5500

### Android 앱 빌드
1. .\build-web.ps1 (웹 자산 dist/로 복사)
2. npx cap sync android
3. npx cap open android (Android Studio 실행)
4. Android Studio에서 Run/Build → APK 생성

## 인수인계 (다음 세션용)

새 세션에서 작업 이어가려면 AI에게 전달:

"CUBELINK Studio 프로젝트 이어가겠습니다. GitHub README.md의 진행 상황 섹션을 먼저 확인하고, 다음 작업 1번부터 시작해주세요."

### 환경 정보
- OS: Windows
- 경로: C:\Projects\CubelinkApp\www\
- Node.js v24.15.0, OpenJDK 25.0.3, Android Studio + SDK
- ANDROID_HOME: %LOCALAPPDATA%\Android\Sdk

### 주요 커밋 / 태그
- e9ef012: Capacitor 6 setup
- 24fd8d3 (v2.8.5): PWA support
- 0d30ef6 (v2.8.4): fitToViewport fix
- 7b329da (v2.8.3-pre-fix): CH340 reconnect
- 01d5d07 (v2.8.2-stable): CH340 auto-reconnect

## 알려진 제약

- iOS: USB Serial 미지원 (Apple 정책)
- 모바일 브라우저 PWA: USB Serial 미지원 → Capacitor 앱 필요
- 데스크톱 PWA: Web Serial 정상 동작

## USB 디바이스 호환성

android/app/src/main/res/xml/device_filter.xml 등록 칩셋:
- CH340 (Vendor 6790, Product 29987) - CUBELINK 로봇 기본
- CH341 (Vendor 6790, Product 21795)
- CP2102 (Vendor 4292, Product 60000)
- FTDI FT232 (Vendor 1027, Product 24577)
- Arduino Uno (Vendor 9025, Product 0067)
- Arduino Mega (Vendor 9025, Product 0042)
- CDC ACM (Vendor 11914, Product 5)

## 🐛 Known Bugs (v2.8.5 - 2026-05-26 발견)

### Bug #1: 실시간 실행 버튼 상태 머신 버그

**증상:**
- "시뮬레이션 시작" 클릭 → "실시간 실행" 버튼이 "■ 실행 중"으로 함께 바뀜 (잘못됨)
- "정지" 클릭 → "실시간 실행" 버튼이 "🖥 그래픽만 실행"으로 락
- 다시 누르면 토글되지만 진짜 실시간 송신 모드 진입 안 됨
- 결과: 로봇 무반응

**정상 사양 (사용자 확인):**
- 시뮬레이션 시작/정지: 3D 그래픽만 제어, 실시간 실행 버튼에 영향 없어야 함
- 실시간 실행 (포트 OFF): 그래픽으로 폴백
- 실시간 실행 (포트 ON): 실물 로봇만 동작, 그래픽 안 움직임

**진단 결과:**
- ✅ Web Serial API 정상 (`navigator.serial` 진짜 API)
- ✅ 포트 정상 열림 (FTDI FT232, vendorId=1027)
- ✅ 수동 송신 성공 (`port.writable.getWriter().write()` 동작)
- ✅ app.js의 명령 포맷 정상 (`S,6,45\n` 등)
- ❌ 실시간 모드 활성화 플래그 미설정 또는 버튼 상태 결합 버그

**의심 코드 위치:**
- `js/app.js`: 시뮬레이션 시작/정지 핸들러와 실시간 실행 핸들러가 같은 상태 변수 공유
- 검색 키워드: `시뮬레이션`, `실시간`, `executionMode`, `runMode`, `isRunning`

**환경:**
- Chrome 데스크톱 PWA: https://tjind.github.io/Cubelink-studio/
- 발생 시점: v2.8.5 PWA 배포 이후 (어제 v2.8.4까지는 정상 동작)
- 코드 변경: index.html PWA 메타태그 추가, sw.js 추가 (app.js는 변경 없음)

**재현 절차:**
1. 로봇 USB 연결 → "연결됨" 표시 확인
2. 미션 3 로드
3. "시뮬레이션 시작" 클릭 → 우측 버튼 동반 변경 관찰
4. "정지" 클릭 → 우측 버튼이 "그래픽만 실행"으로 락
5. "실시간 실행" 클릭 → 콘솔에 TX 송신 확인되지만 로봇 무반응

**다음 작업 (v2.8.6 또는 v2.9.0):**
1. app.js에서 두 버튼의 상태 분리
2. 실시간 모드 활성화 시 별도 플래그 (예: `realtimeMode = true`)
3. 시뮬레이션 핸들러는 3D만 제어, 시리얼 송신 분기 명확화
4. 정지 버튼은 본인 모드만 중단

