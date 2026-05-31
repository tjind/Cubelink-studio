/* ============================================================
   CUBELINK Studio v2.8.9 — 미션 완료 UX (졸업 모드 통합)
   - 모든 미션 완료 시 축하 팝업 표시
   - 졸업 모드(body.graduated)가 panel-left를 자동으로 숨김
   - 다시 보기 ▶ 버튼: 클릭 시 졸업 모드 해제 + 패널 복원
   ============================================================ */
(function () {
  'use strict';

  let cssInjected = false;
  let alreadyShown = false;

  function injectCSS() {
    if (cssInjected) return;
    cssInjected = true;
    const css = `
      #amcOverlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.55);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999; opacity: 0; transition: opacity 0.3s ease;
      }
      #amcOverlay.show { opacity: 1; }
      #amcModal {
        background: linear-gradient(135deg, #FFF8DC, #FFE4B5);
        border: 3px solid #D4AF37; border-radius: 20px;
        padding: 40px 50px; text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        transform: scale(0.7); transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        max-width: 90vw;
      }
      #amcOverlay.show #amcModal { transform: scale(1); }
      #amcTitle { font-size: 32px; font-weight: 800; color: #8B4513; margin: 0 0 12px; }
      #amcSubtitle { font-size: 18px; color: #654321; margin: 0 0 24px; }
      #amcBtn {
        background: #D4AF37; color: #fff; border: none; padding: 12px 32px;
        font-size: 16px; font-weight: 700; border-radius: 10px; cursor: pointer;
        transition: background 0.2s;
      }
      #amcBtn:hover, #amcBtn:focus { background: #B8941F; outline: 2px solid #654321; }
      #amcRestoreBtn {
        position: fixed; left: 0; top: 50%; transform: translateY(-50%);
        background: #D4AF37; color: #fff; border: none;
        padding: 14px 8px; font-size: 18px; font-weight: 700;
        border-top-right-radius: 10px; border-bottom-right-radius: 10px;
        cursor: pointer; z-index: 9998; box-shadow: 2px 2px 8px rgba(0,0,0,0.3);
        transition: background 0.2s, padding 0.2s;
      }
      #amcRestoreBtn:hover { background: #B8941F; padding-right: 14px; }
      @media (prefers-reduced-motion: reduce) {
        #amcOverlay, #amcModal { transition: none !important; }
      }
    `;
    const style = document.createElement('style');
    style.id = 'amcStyle';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function showRestoreButton() {
    if (document.getElementById('amcRestoreBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'amcRestoreBtn';
    btn.innerHTML = '▶';
    btn.title = '미션 패널 다시 보기';
    btn.setAttribute('aria-label', '미션 패널 다시 보기');
    btn.addEventListener('click', restorePanel);
    document.body.appendChild(btn);
  }

  function restorePanel() {
    // 졸업 모드 해제 → CSS가 자동으로 panel-left 복원
    document.body.classList.remove('graduated');
    window._graduationRestored = true;  // v2.8.10: 학생이 복원 의사 표시
    // 시리얼 모니터를 다시 panel-left 하단으로 복귀
    const monitor = document.getElementById('serialMonitorBar');
    const panelLeft = document.querySelector('.panel-left');
    if (monitor && panelLeft && monitor.parentElement !== panelLeft) {
      panelLeft.appendChild(monitor);
    }
    // ▶ 버튼 제거
    const btn = document.getElementById('amcRestoreBtn');
    if (btn) btn.remove();
    // Blockly 영역 재계산
    if (window.workspace && typeof Blockly !== 'undefined') {
      setTimeout(() => Blockly.svgResize(window.workspace), 50);
    }
  }

  function showModal() {
    const overlay = document.createElement('div');
    overlay.id = 'amcOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'amcTitle');
    overlay.innerHTML = `
      <div id="amcModal">
        <h2 id="amcTitle">🎉 모든 미션을 완료하였습니다!</h2>
        <p id="amcSubtitle">정말 잘했어요!</p>
        <button id="amcBtn" type="button">확인</button>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    const btn = document.getElementById('amcBtn');
    if (btn) btn.focus();

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      overlay.classList.remove('show');
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        document.removeEventListener('keydown', onKey);
        // 팝업 닫힌 후 ▶ 버튼 표시 (졸업 모드는 이미 발동되어 panel-left 숨김 상태)
        setTimeout(showRestoreButton, 200);
      }, 300);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };

    if (btn) btn.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    setTimeout(close, 2000);
  }

  window.showAllMissionsComplete = function (opts) {
    opts = opts || {};
    if (alreadyShown && !opts.force) return;
    alreadyShown = true;
    injectCSS();
    showModal();
  };

  window.resetAllMissionsComplete = function () {
    alreadyShown = false;
    const btn = document.getElementById('amcRestoreBtn');
    if (btn) btn.remove();
  };
})();
