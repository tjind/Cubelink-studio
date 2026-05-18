/**
 * CUBELINK Studio - 모바일 전용 인터페이스(UI) 토글 컨트롤러
 * 화면 폭이 768px 이하일 때 터치 친화적인 슬라이드 패널 동작을 제어합니다.
 */
(function() {
  // 현재 화면이 모바일/태블릿 규격(768px 이하)인지 판별하는 함수
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  // 스마트폰 환경이라면 기존 데스크톱용 강제 가로화면(width=1280) 설정을 지우고,
  // 기기 화면 비율에 딱 맞춰지도록 반응형 뷰포트로 강제 재작성합니다.
  if (isMobile()) {
    const viewports = document.querySelectorAll('meta[name="viewport"]');
    viewports.forEach(v => v.remove());
    
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(meta);
  }

  document.addEventListener('DOMContentLoaded', () => {
    // 1. 모바일 전용 우측 패널 제어용 플로팅 버튼(💡)을 화면에 동적으로 생성
    const rtBtn = document.createElement('button');
    rtBtn.id = 'mobileRightToggle';
    rtBtn.innerHTML = '💡';
    rtBtn.title = '힌트/시뮬레이터/C++ 코드 보기';
    document.body.appendChild(rtBtn);

    // 주요 UI 요소들 가져오기
    const panelLeft = document.querySelector('.panel-left');
    const panelRight = document.querySelector('.panel-right');
    const overlay = document.getElementById('panelOverlay');
    const hamburger = document.getElementById('btnHamburger');

    // 2. ☰ 햄버거 버튼 클릭 ➡️ 좌측 미션 패널 열기/닫기
    if (hamburger && panelLeft) {
      hamburger.addEventListener('click', (e) => {
        if (!isMobile()) return; // 데스크톱 환경일 때는 작동하지 않음
        e.stopPropagation();
        panelLeft.classList.toggle('mobile-open');
        
        // 사이드바가 열리면 뒷배경을 어둡게 막아주는 오버레이 표시
        if (overlay) {
          overlay.classList.toggle('show', panelLeft.classList.contains('mobile-open'));
        }
      });
    }

    // 3. 어두운 뒷배경(오버레이) 클릭 ➡️ 열려있던 좌측 사이드바 닫기
    if (overlay) {
      overlay.addEventListener('click', () => {
        panelLeft?.classList.remove('mobile-open');
        overlay.classList.remove('show');
      });
    }

    // 4. 우측 하단 플로팅 버튼(💡) 클릭 ➡️ 우측 바텀시트 패널 올리기/내리기
    rtBtn.addEventListener('click', () => {
      panelRight?.classList.toggle('mobile-open');
    });

    // 5. 우측 바텀시트 상단의 얇은 손잡이 영역을 터치해도 패널이 열고 닫히도록 제어
    if (panelRight) {
      panelRight.addEventListener('click', (e) => {
        if (!isMobile()) return;
        const rect = panelRight.getBoundingClientRect();
        // 패널 맨 위쪽 경계선으로부터 20px 이내의 손잡이 영역을 눌렀는지 판별
        if (e.clientY - rect.top < 20) {
          panelRight.classList.toggle('mobile-open');
        }
      });
    }

    // 6. 학생들이 미션을 터치해 선택하면, 화면을 가리지 않도록 좌측 미션 사이드바를 자동으로 닫아줌
    document.addEventListener('click', (e) => {
      if (!isMobile()) return;
      if (e.target.closest('.mission-item')) {
        setTimeout(() => {
          panelLeft?.classList.remove('mobile-open');
          overlay?.classList.remove('show');
        }, 150);
      }
    });

    // 7. 화면 회전(가로/세로)이나 크기가 변할 때 Blockly 코딩창이 깨지지 않게 리사이즈 처리
    window.addEventListener('resize', () => {
      if (window.Blockly && window.Blockly.svgResize && window.workspace) {
        try { 
          window.Blockly.svgResize(window.workspace); 
        } catch(e) {
          console.warn('[UI] Blockly 리사이즈 대기 중');
        }
      }
    });
  });
})();