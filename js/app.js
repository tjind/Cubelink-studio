/**
 * CUBELINK Studio v2.7.2 - 메인 애플리케이션 제어 로직
 * 핵심 개선 (v2.7.1 → v2.7.2):
 *  - blocks.js 실제 필드명에 맞춰 evalValue 전면 보정
 *    · cubelink_joystick_read: NAME/PROP (값 '왼쪽'/'오른쪽', 'X'/'Y'/'BTN')
 *    · cubelink_v2_joystick_x/y/btn: JNAME 필드 인식
 *    · cubelink_map: VAL 입력 + FL/FH/TL/TH 필드
 *    · cubelink_map_simple: VAL/FL/FH/TL/TH 모두 필드
 *    · cubelink_analogread: A0~A3 → 조이스틱 raw 값 자동 매핑
 *    · cubelink_digitalread: PIN 2/7 → 조이스틱 SW 자동 매핑 (INPUT_PULLUP 반전)
 *    · cubelink_ultrasonic: window._ultrasonicValue 폴백
 *  - runProgram에 신규 블록 처리 추가
 *    · cubelink_v2_joystick_init / cubelink_v2_if / cubelink_v2_if_else
 *    · cubelink_serial_begin / cubelink_v2_serial_begin
 *    · cubelink_serial_println_text/num/value
 *    · cubelink_pinmode (시뮬레이션에서는 로그만)
 *  - 기존 안전장치(MAX_TOTAL_LOOPS, safeAngle, yield) 그대로 유지
 *  - updateJoystickUI 자동 래핑 유지
 *  - arduino_setup_loop 더미 코드 생성기 유지
 */
(function() {
  'use strict';

  const CURRICULUM = [
    {
      level: "basic", levelTitle: "🌱 단계별 기초 실습",
      missions: [
        { id: 1, title: "미션 1: 로봇팔 차렷 자세 만들기", desc: "서보 모터 블록들을 활용하여 4개 관절(6, 9, 10, 11)을 모두 안전 각도인 90도로 정렬해 보세요.", hint: "‘서보 모터’ 카테고리에서 ‘서보 핀 X을 90도로 회전’ 블록 4개를 가져와 조립하세요." },
        { id: 2, title: "미션 2: 베이스 좌우 회전하기", desc: "로봇팔의 중심축인 PIN 6번 모터를 45도로 돌렸다가 2초 후 135도로 움직여 보세요.", hint: "회전 블록 사이에 ‘기본 구조’의 ‘X초 기다리기’ 블록을 배치해야 눈으로 움직임을 확인할 수 있습니다." },
        { id: 3, title: "미션 3: 그리퍼 집게 작동하기", desc: "PIN 11번 그리퍼 서보모터를 50도(열기)로 설정한 후, 1초 뒤 120도(꽉 잡기)로 움직여 물건을 집어 보세요.", hint: "그리퍼가 너무 과하게 닫히면 부하가 걸리니 50도~120도 사이 안전 범위를 준수하세요." }
      ]
    },
    {
      level: "intermediate", levelTitle: "🚀 조이스틱 심화 제어",
      missions: [
        { id: 4, title: "미션 4: 조이스틱 센서 준비", desc: "시리얼 통신을 시작하고, 왼쪽 조이스틱을 아날로그 A0, A1 핀과 스위치 2번에 연결해 초기화하세요.", hint: "‘조이스틱’ 카테고리에서 초기화 블록을 가져와 ‘처음 한 번 setup()’ 칸에 넣어야 합니다." },
        { id: 5, title: "미션 5: 조이스틱 값 모니터링", desc: "반복 루프 안에서 왼쪽 조이스틱의 X축 값을 읽어와 시리얼 모니터 창에 실시간으로 출력해 보세요.", hint: "시리얼 통신 시작 블록을 setup에 넣고, loop 안에서 ‘시리얼에 값 출력’ 블록과 조이스틱 읽기 블록을 합치세요." },
        { id: 6, title: "미션 6: 조이스틱으로 베이스 조종", desc: "조이스틱의 X축 아날로그 값(0~1023)을 서보모터 각도 범위(0~180)로 map 변환하여 베이스 6번 모터를 조종하세요.", hint: "‘센서·아날로그’ 카테고리의 ‘값 변환(map)’ 블록을 서보 회전 블록의 각도 자리에 쏙 끼워 넣으세요." }
      ]
    },
    {
      level: "advanced", levelTitle: "🤖 자율주행 및 인공지능 응용",
      missions: [
        { id: 7, title: "미션 7: 초음파 레이더 가동", desc: "초음파 센서(Trig D4 / Echo D5)를 활성화하여 전방의 물체까지의 거리를 cm 단위로 정밀하게 측정해 보세요.", hint: "거리를 읽어와 바로 시리얼 모니터에 출력하도록 루프문을 구성하여 센서 수치 변화를 관찰하세요." },
        { id: 8, title: "미션 8: 장애물 감지 자동 비상정지", desc: "만약 초음파 센서 거리가 15cm 이하로 좁혀지면 그리퍼 집게를 즉시 켜고 베이스를 정지하는 안전 매커니즘을 만드세요.", hint: "‘흐름 제어’의 ‘만약 ~ 이라면’ 블록과 ‘센서·아날로그’의 비교 연산자(<) 블록을 유기적으로 결합하세요." },
        { id: 9, title: "미션 9: CUBELINK 공장 자동화 프로젝트", desc: "조이스틱으로 물건을 집어 올린 후, 초음파 센서에 손을 대면 지정된 위치로 자동으로 물건을 이송하는 복합 매크로 코딩을 완성하세요.", hint: "지금까지 배운 모든 센서와 서보 블록을 총동원하여 융합 논리 회로를 설계하는 마스터 단계입니다." }
      ]
    }
  ];

  let workspace;
  let currentMissionId = 1;
  let activeTab = 'hint';

  // ─── 전역 데이터 저장소 ───
  window.joystickData = window.joystickData || {
    left:  { x: 500, y: 500, sw: 0 },
    right: { x: 500, y: 500, sw: 0 }
  };
  window.servoAngles = window.servoAngles || { 6: 90, 9: 90, 10: 90, 11: 90 };
  window._userVars = window._userVars || {};
  window._ultrasonicValue = window._ultrasonicValue != null ? window._ultrasonicValue : 30;

  /* ============================================================
     초음파 슬라이더 → window._ultrasonicValue 자동 동기화
     ============================================================ */
  function bindUltrasonicSlider() {
    const slider = document.getElementById('usSlider');
    if (!slider) { setTimeout(bindUltrasonicSlider, 200); return; }
    if (slider._bound) return;
    slider._bound = true;
    const sync = () => {
      window._ultrasonicValue = parseFloat(slider.value) || 0;
      const span = document.getElementById('usValue');
      if (span) span.textContent = Math.round(window._ultrasonicValue);
    };
    slider.addEventListener('input', sync);
    sync();
    console.log('✅ 초음파 슬라이더 → _ultrasonicValue 동기화');
  }

  /* ============================================================
     updateJoystickUI 자동 래핑
     → 실제 조이스틱 데이터(시리얼 수신)가 window.joystickData에 자동 저장
     ============================================================ */
  function wrapUpdateJoystickUI() {
    if (typeof window.updateJoystickUI !== 'function') {
      setTimeout(wrapUpdateJoystickUI, 50);
      return;
    }
    if (window.updateJoystickUI._wrapped) return;

    const orig = window.updateJoystickUI;
    window.updateJoystickUI = function(which, x, y, sw) {
      const result = orig.apply(this, arguments);

      // which 정규화: 1/'1'/'left'/'Left'/'L' → 'left',  2/'2'/'right'/'Right'/'R' → 'right'
      const w = String(which || '').toLowerCase();
      let key;
      if (w === '1' || w === 'left'  || w === 'l') key = 'left';
      else if (w === '2' || w === 'right' || w === 'r') key = 'right';
      else if (w.includes('left'))  key = 'left';
      else if (w.includes('right')) key = 'right';
      else key = 'left';

      if (!window.joystickData[key]) window.joystickData[key] = {};
      window.joystickData[key].x  = (typeof x === 'number') ? x : parseInt(x, 10) || 500;
      window.joystickData[key].y  = (typeof y === 'number') ? y : parseInt(y, 10) || 500;
      window.joystickData[key].sw = sw ? 1 : 0;

      return result;
    };
    window.updateJoystickUI._wrapped = true;
    console.log('✅ updateJoystickUI 래핑 완료 — 조이스틱 → joystickData 자동 동기화');
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (window.Sim && typeof window.Sim.init === 'function') {
      window.Sim.init();
    }

    workspace = Blockly.inject('blocklyDiv', {
      toolbox: document.getElementById('toolbox'),
      grid: { spacing: 20, length: 3, colour: '#ccc', gridBySnap: true },
      trashcan: true,
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
      resize: true
    });
    window.workspace = workspace;

    // 더미 Arduino 코드 생성기 — 콘솔 에러 제거
    if (window.Arduino) {
      if (!window.Arduino.forBlock) window.Arduino.forBlock = {};
      if (!window.Arduino.forBlock['arduino_setup_loop']) {
        window.Arduino.forBlock['arduino_setup_loop'] = function(block) {
          const setupCode = window.Arduino.statementToCode(block, 'SETUP') || '';
          const loopCode  = window.Arduino.statementToCode(block, 'LOOP')  || '';
          return setupCode + loopCode;
        };
      }
    }

    // 우클릭 메뉴: 스택 전체 복제
    if (Blockly.ContextMenuRegistry && Blockly.ContextMenuRegistry.registry) {
      try {
        Blockly.ContextMenuRegistry.registry.register({
          id: 'duplicate_stack',
          weight: 1.5,
          scopeType: Blockly.ContextMenuRegistry.ScopeType.BLOCK,
          displayText: '🔗 스택 전체 복제',
          preconditionFn: (scope) => (scope.block && !scope.block.isInFlyout) ? 'enabled' : 'hidden',
          callback: (scope) => {
            const src = scope.block;
            const ws = src.workspace;
            const xml = Blockly.Xml.blockToDom(src, true);
            const newBlock = Blockly.Xml.domToBlock(xml, ws);
            const pos = src.getRelativeToSurfaceXY();
            newBlock.moveBy(pos.x + 30, pos.y + 30);
          }
        });
        console.log('✅ 스택 전체 복제 메뉴 등록');
      } catch(e) { console.warn('컨텍스트 메뉴 등록 실패:', e.message); }
    }

    workspace.addChangeListener(updateCppCodeView);

    renderCurriculumMenu();
    setupTabEvents();
    setupButtonEvents();
    loadMission(1);

    // 외부 의존 초기화
    wrapUpdateJoystickUI();
    bindUltrasonicSlider();

    setTimeout(triggerResize, 300);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 600);
  });

  /* ============================================================
     커리큘럼 메뉴
     ============================================================ */
  function renderCurriculumMenu() {
    const container = document.getElementById('missionList');
    if (!container) return;
    container.innerHTML = '';

    CURRICULUM.forEach(group => {
      const gDiv = document.createElement('div');
      gDiv.className = 'mission-group';
      gDiv.setAttribute('data-level', group.level);

      const gHeader = document.createElement('div');
      gHeader.className = 'mission-group-header';
      gHeader.innerHTML = `
        <div class="group-title"><span>📂</span> ${group.levelTitle}</div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="group-badge">${group.missions.length}개</span>
          <span class="toggle-arrow">▼</span>
        </div>
      `;
      gHeader.addEventListener('click', () => gDiv.classList.toggle('collapsed'));

      const gBody = document.createElement('div');
      gBody.className = 'mission-group-body';

      group.missions.forEach(m => {
        const mItem = document.createElement('div');
        mItem.className = 'mission-item';
        mItem.id = `mItem-${m.id}`;
        mItem.innerHTML = `
          <div class="mission-num">${m.id}</div>
          <div style="flex:1;">
            <strong>${m.title}</strong>
            <small>${m.desc.substring(0, 32)}...</small>
          </div>
        `;
        mItem.addEventListener('click', () => loadMission(m.id));
        gBody.appendChild(mItem);
      });

      gDiv.appendChild(gHeader);
      gDiv.appendChild(gBody);
      container.appendChild(gDiv);
    });
  }

  function loadMission(id) {
    currentMissionId = id;
    let target = null;
    CURRICULUM.forEach(g => g.missions.forEach(m => { if (m.id === id) target = m; }));
    if (!target) return;

    document.querySelectorAll('.mission-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById(`mItem-${id}`);
    if (activeEl) activeEl.classList.add('active');

    document.getElementById('missionTitle').innerText = target.title;
    document.getElementById('missionDesc').innerText = target.desc;
    document.getElementById('hintPanel').innerHTML = `
      <div style="padding:10px; border-left:4px solid var(--gold); background:var(--charcoal-2); border-radius:4px;">
        <h4 style="margin:0 0 8px 0; color:var(--gold);">💡 미션 성공 가이드</h4>
        ${target.hint}
      </div>
    `;

    switchTab('hint');

    if (workspace) {
      workspace.clear();
      try {
        const initBlock = workspace.newBlock('arduino_setup_loop');
        initBlock.initSvg();
        initBlock.render();
        initBlock.moveBy(20, 20);
      } catch(e) {}

      setTimeout(() => {
        if (typeof Blockly.svgResize === 'function') Blockly.svgResize(workspace);
        if (typeof workspace.scrollHome === 'function') workspace.scrollHome();
      }, 100);
    }
  }

  /* ============================================================
     C++ 코드 미리보기 갱신
     ============================================================ */
  function updateCppCodeView() {
    if (!workspace || !window.Arduino) return;
    if (typeof window.resetHeaders === 'function') window.resetHeaders();
    if (typeof window.v2ResetMaps === 'function') window.v2ResetMaps();

    let bodyCode = '';
    try { bodyCode = window.Arduino.workspaceToCode(workspace); } catch(e) { /* 무시 */ }

    let fullCode = `/**\n * CUBELINK Studio v2.7.2 Generated Source\n */\n`;
    if (window.headerExtras) {
      window.headerExtras.includes.forEach(inc => fullCode += `${inc}\n`);
      window.headerExtras.globals.forEach(gl => fullCode += `${gl}\n`);
      window.headerExtras.helpers.forEach(hp => fullCode += `${hp}\n\n`);
    }

    fullCode += `\nvoid setup() {\n  // 제품 초기화 및 설정\n`;
    const setupBlocks = workspace.getBlocksByType('arduino_setup_loop');
    if (setupBlocks.length > 0) {
      try { fullCode += window.Arduino.statementToCode(setupBlocks[0], 'SETUP'); } catch(e) {}
    } else {
      fullCode += `  Serial.begin(9600);\n`;
    }
    fullCode += `}\n\nvoid loop() {\n`;
    if (setupBlocks.length > 0) {
      try { fullCode += window.Arduino.statementToCode(setupBlocks[0], 'LOOP'); } catch(e) {}
    } else {
      fullCode += bodyCode;
    }
    fullCode += `}\n`;

    const outPre = document.getElementById('cppOut');
    if (outPre) outPre.innerText = fullCode;

    syncBlocksTo3D();
  }

  function syncBlocksTo3D() {
    if (!workspace) return;
    const allBlocks = workspace.getAllBlocks(false);
    allBlocks.forEach(b => {
      if (b.type === 'cubelink_servo_move_simple' || b.type === 'cubelink_servo_smooth_simple' || b.type === 'cubelink_v2_servo_set') {
        const pin = b.getFieldValue('PIN');
        const val = parseFloat(b.getFieldValue('ANGLE')) || 90;
        if (window.Sim && typeof window.Sim.setServoAngle === 'function') {
          window.Sim.setServoAngle(pin, val);
        }
      }
    });
  }

  /* ============================================================
     탭 전환
     ============================================================ */
  function setupTabEvents() {
    document.querySelectorAll('.tabs .tab').forEach(t => {
      t.addEventListener('click', () => switchTab(t.getAttribute('data-tab')));
    });
  }
  function switchTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tabId));
    document.querySelectorAll('.tab-body').forEach(b => b.classList.toggle('active', b.getAttribute('data-body') === tabId));

    if (tabId === 'sim') {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        if (window.Sim && typeof window.Sim.setServoAngle === 'function') syncBlocksTo3D();
      }, 100);
    }
    if ((tabId === 'hint' || tabId === 'cpp') && workspace) {
      setTimeout(triggerResize, 50);
    }
  }

  /* ============================================================
     공통 헬퍼: 이름 → 키 (왼쪽/오른쪽 등)
     ============================================================ */
  function nameToKey(name) {
    if (!name) return 'left';
    const s = String(name).toLowerCase().trim();
    if (s === '오른쪽' || s === 'right' || s === 'r' || s === '2' || s === 'joyright' || s.includes('right')) return 'right';
    return 'left';
  }

  /* ============================================================
     ★ 값 평가 엔진 (evalValue) ★
     blocks.js 실제 필드명 기준으로 전면 보정 (v2.7.2)
     ============================================================ */
  function evalValue(block) {
    if (!block) return 0;
    const t = block.type;

    try {
      // ─── 숫자 / 문자열 리터럴 ───
      if (t === 'math_number') return parseFloat(block.getFieldValue('NUM')) || 0;
      if (t === 'text')        return block.getFieldValue('TEXT') || '';

      // ─── 산술 ───
      if (t === 'math_arithmetic') {
        const op = block.getFieldValue('OP');
        const a = parseFloat(evalValue(block.getInputTargetBlock('A'))) || 0;
        const b = parseFloat(evalValue(block.getInputTargetBlock('B'))) || 0;
        switch (op) {
          case 'ADD':      return a + b;
          case 'MINUS':    return a - b;
          case 'MULTIPLY': return a * b;
          case 'DIVIDE':   return b === 0 ? 0 : a / b;
          case 'POWER':    return Math.pow(a, b);
        }
        return 0;
      }

      // ─── 비교 ───
      if (t === 'logic_compare') {
        const op = block.getFieldValue('OP');
        const a = parseFloat(evalValue(block.getInputTargetBlock('A')));
        const b = parseFloat(evalValue(block.getInputTargetBlock('B')));
        switch (op) {
          case 'EQ':  return a === b;
          case 'NEQ': return a !== b;
          case 'LT':  return a < b;
          case 'LTE': return a <= b;
          case 'GT':  return a > b;
          case 'GTE': return a >= b;
        }
        return false;
      }

      // ─── 논리 ───
      if (t === 'logic_operation') {
        const op = block.getFieldValue('OP');
        const a = evalValue(block.getInputTargetBlock('A'));
        const b = evalValue(block.getInputTargetBlock('B'));
        return op === 'AND' ? (a && b) : (a || b);
      }
      if (t === 'logic_negate')  return !evalValue(block.getInputTargetBlock('BOOL'));
      if (t === 'logic_boolean') return block.getFieldValue('BOOL') === 'TRUE';

      // ═══════════════════════════════════════════════════════
      // 조이스틱 — 통합형 (구버전)  cubelink_joystick_read
      //   필드: NAME ('왼쪽'/'오른쪽'), PROP ('X'/'Y'/'BTN')
      // ═══════════════════════════════════════════════════════
      if (t === 'cubelink_joystick_read') {
        const name = block.getFieldValue('NAME') || '왼쪽';
        const prop = block.getFieldValue('PROP') || 'X';
        const key  = nameToKey(name);
        const data = window.joystickData?.[key] || { x:500, y:500, sw:0 };
        if (prop === 'Y')   return data.y;
        if (prop === 'BTN') return data.sw ? 1 : 0;
        return data.x;
      }

      // ═══════════════════════════════════════════════════════
      // 조이스틱 — v2 분리형  cubelink_v2_joystick_x/y/btn
      //   필드: JNAME ('왼쪽'/'오른쪽')
      // ═══════════════════════════════════════════════════════
      if (t === 'cubelink_v2_joystick_x') {
        const key = nameToKey(block.getFieldValue('JNAME'));
        return window.joystickData?.[key]?.x ?? 500;
      }
      if (t === 'cubelink_v2_joystick_y') {
        const key = nameToKey(block.getFieldValue('JNAME'));
        return window.joystickData?.[key]?.y ?? 500;
      }
      if (t === 'cubelink_v2_joystick_btn') {
        const key = nameToKey(block.getFieldValue('JNAME'));
        return window.joystickData?.[key]?.sw ? 1 : 0;
      }

      // ═══════════════════════════════════════════════════════
      // 서보 현재 각도  cubelink_servo_read / cubelink_v2_servo_read
      //   필드: PIN ('6'/'9'/'10'/'11' 등)
      // ═══════════════════════════════════════════════════════
      if (t === 'cubelink_servo_read' || t === 'cubelink_v2_servo_read') {
        const pin = block.getFieldValue('PIN');
        const span = document.getElementById('servoAngle' + pin);
        if (span) {
          const v = parseFloat(span.innerText);
          if (!isNaN(v)) return v;
        }
        return window.servoAngles[pin] != null ? window.servoAngles[pin] : 90;
      }

      // ═══════════════════════════════════════════════════════
      // map — 값 입력형  cubelink_map
      //   입력: VAL  /  필드: FL, FH, TL, TH
      // ═══════════════════════════════════════════════════════
      if (t === 'cubelink_map') {
        const v  = parseFloat(evalValue(block.getInputTargetBlock('VAL'))) || 0;
        const fL = parseFloat(block.getFieldValue('FL')) || 0;
        const fH = parseFloat(block.getFieldValue('FH')) || 1023;
        const tL = parseFloat(block.getFieldValue('TL')) || 0;
        const tH = parseFloat(block.getFieldValue('TH')) || 180;
        if (fH === fL) return tL;
        return Math.round((v - fL) * (tH - tL) / (fH - fL) + tL);
      }

      // ═══════════════════════════════════════════════════════
      // map — 필드형  cubelink_map_simple
      //   필드: VAL, FL, FH, TL, TH (전부 number 필드)
      // ═══════════════════════════════════════════════════════
      if (t === 'cubelink_map_simple') {
        const v  = parseFloat(block.getFieldValue('VAL')) || 0;
        const fL = parseFloat(block.getFieldValue('FL')) || 0;
        const fH = parseFloat(block.getFieldValue('FH')) || 1023;
        const tL = parseFloat(block.getFieldValue('TL')) || 0;
        const tH = parseFloat(block.getFieldValue('TH')) || 180;
        if (fH === fL) return tL;
        return Math.round((v - fL) * (tH - tL) / (fH - fL) + tL);
      }

      // ═══════════════════════════════════════════════════════
      // 아날로그 핀 읽기  cubelink_analogread
      //   A0=왼쪽X, A1=왼쪽Y, A2=오른쪽X, A3=오른쪽Y
      // ═══════════════════════════════════════════════════════
      if (t === 'cubelink_analogread') {
        const pin = block.getFieldValue('PIN');
        if (pin === 'A0') return window.joystickData?.left?.x  ?? 500;
        if (pin === 'A1') return window.joystickData?.left?.y  ?? 500;
        if (pin === 'A2') return window.joystickData?.right?.x ?? 500;
        if (pin === 'A3') return window.joystickData?.right?.y ?? 500;
        return 0;
      }

      // ═══════════════════════════════════════════════════════
      // 디지털 핀 읽기  cubelink_digitalread
      //   PIN 2 = 왼쪽 SW (INPUT_PULLUP — 눌림=LOW=0)
      //   PIN 7 = 오른쪽 SW
      //   PIN 13 = LED (디지털 출력 상태 반영)
      // ═══════════════════════════════════════════════════════
      if (t === 'cubelink_digitalread') {
        const pin = block.getFieldValue('PIN');
        if (pin === '2') return window.joystickData?.left?.sw  ? 0 : 1;
        if (pin === '7') return window.joystickData?.right?.sw ? 0 : 1;
        return 1;
      }

      // ═══════════════════════════════════════════════════════
      // 초음파  cubelink_ultrasonic
      //   필드: TRIG, ECHO  (시뮬레이션에서는 슬라이더 값 반환)
      // ═══════════════════════════════════════════════════════
      if (t === 'cubelink_ultrasonic') {
        return window._ultrasonicValue != null ? window._ultrasonicValue : 30;
      }

      // ─── 변수 ───
      if (t === 'variables_get') {
        const name = block.getField('VAR') ? block.getField('VAR').getText() : block.getFieldValue('VAR');
        return (window._userVars[name] != null) ? window._userVars[name] : 0;
      }

      // ─── 폴백: NUM 필드가 있으면 숫자로 ───
      const numField = block.getFieldValue('NUM');
      if (numField != null) return parseFloat(numField) || 0;

    } catch (e) {
      console.warn('evalValue 오류:', t, e.message);
    }
    return 0;
  }
  window.evalValue = evalValue;

  /* ============================================================
     공통 실행 엔진 (실시간 + 시뮬레이션) — 안전장치 포함
     ============================================================ */
  async function runProgram() {
    const simOnly = window._simulationOnly === true;
    window._simulationOnly = false;
    const port = window._serialPort;
    const useSerial = !simOnly && port && port.writable;

    // 안전장치
    let loopCount = 0;
    const MAX_TOTAL_LOOPS = 100000;
    let startTime = performance.now();
    let warnedTooFast = false;

    function safeAngle(pin, angle, blockType) {
      const a = parseFloat(angle);
      if (isNaN(a)) {
        appendSerialLog(`⚠️ [${blockType}] PIN ${pin}: 각도값이 숫자가 아님 (${angle}) → 무시`);
        return null;
      }
      if (a < 0 || a > 180) {
        const clamped = Math.max(0, Math.min(180, a));
        appendSerialLog(`⚠️ [${blockType}] PIN ${pin}: 각도 ${Math.round(a)}° → ${Math.round(clamped)}°로 보정`);
        return clamped;
      }
      return a;
    }

    if (!simOnly && !useSerial) {
      if (!confirm("로봇이 연결되지 않았습니다. 3D 시뮬레이션만 실행할까요?")) return;
    }

    // 이미 실행 중이면 중단
    if (window._runtimeRunning) {
      window._runtimeRunning = false;
      appendSerialLog("⏹ 중단 요청");
      return;
    }
    window._runtimeRunning = true;

    const writer = useSerial ? port.writable.getWriter() : null;
    const enc = new TextEncoder();
    const btnRT = document.getElementById('btnRunRealtime');
    const originalText = btnRT ? btnRT.textContent : '';
    if (btnRT) btnRT.textContent = '⏹ 실행 중 (클릭하여 중단)';

    const simStatusEl = document.getElementById('simStatus');
    if (simStatusEl) { simStatusEl.textContent = '● 실행 중'; simStatusEl.classList.add('running'); }

    const setupRoot = workspace.getBlocksByType('arduino_setup_loop')[0];
    if (!setupRoot) {
      appendSerialLog("⚠️ setup/loop 블록이 없습니다");
      window._runtimeRunning = false;
      if (btnRT) btnRT.textContent = originalText;
      if (writer) writer.releaseLock();
      if (simStatusEl) { simStatusEl.textContent = '● 대기 중'; simStatusEl.classList.remove('running'); }
      return;
    }

    const setupChain = setupRoot.getInputTargetBlock('SETUP');
    const loopChain  = setupRoot.getInputTargetBlock('LOOP');

    const chainToArray = (head) => {
      const arr = [];
      let cur = head;
      while (cur) { arr.push(cur); cur = cur.getNextBlock(); }
      return arr;
    };

    // ─── 서보 전송 공통 ───
    async function sendServo(pin, angle) {
      if (writer) {
        try { await writer.write(enc.encode(`S,${pin},${angle}\n`)); }
        catch(e) { appendSerialLog(`❌ 시리얼 전송 오류: ${e.message}`); }
      }
      if (window.Sim) Sim.setServoAngle(pin, angle);
      window.servoAngles[pin] = angle;
    }

    // ─── 단일 블록 실행 ───
    const execBlock = async (b) => {
      if (!window._runtimeRunning) return;
      const t = b.type;

      try {
        // ═══ 서보 — 필드 직접 입력형 ═══
        if (t === 'cubelink_servo_move_simple' || t === 'cubelink_v2_servo_set') {
          const pin   = b.getFieldValue('PIN');
          const angle = safeAngle(pin, b.getFieldValue('ANGLE'), t);
          if (angle === null) return;
          await sendServo(pin, angle);
          appendSerialLog(`  S,${pin},${angle}`);
          await new Promise(r => setTimeout(r, 30));
          return;
        }

        // ═══ 서보 — 값 입력형 ═══
        if (t === 'cubelink_servo_move' || t === 'cubelink_v2_servo_set_value') {
          const pin   = b.getFieldValue('PIN');
          const inner = b.getInputTargetBlock('ANGLE');
          const raw   = inner ? evalValue(inner) : 90;
          const angle = safeAngle(pin, raw, t);
          if (angle === null) return;
          await sendServo(pin, angle);
          appendSerialLog(`  S,${pin},${angle}`);
          await new Promise(r => setTimeout(r, 30));
          return;
        }

        // ═══ 서보 — 부드럽게 (필드형) ═══
        if (t === 'cubelink_servo_smooth_simple') {
          const pin    = b.getFieldValue('PIN');
          const target = safeAngle(pin, b.getFieldValue('ANGLE'), t);
          if (target === null) return;
          const sec    = parseFloat(b.getFieldValue('SEC')) || 1;
          const steps  = Math.max(5, Math.floor(sec * 20));
          const start  = window.servoAngles[pin] != null ? window.servoAngles[pin] : 90;
          for (let i = 1; i <= steps; i++) {
            if (!window._runtimeRunning) return;
            const a = Math.round(start + (target - start) * (i / steps));
            await sendServo(pin, a);
            await new Promise(r => setTimeout(r, (sec * 1000) / steps));
          }
          return;
        }

        // ═══ 서보 — 부드럽게 (값 입력형) ═══
        if (t === 'cubelink_servo_smooth') {
          const pin    = b.getFieldValue('PIN');
          const inner  = b.getInputTargetBlock('ANGLE');
          const raw    = inner ? evalValue(inner) : 90;
          const target = safeAngle(pin, raw, t);
          if (target === null) return;
          const sec    = parseFloat(b.getFieldValue('SEC')) || 1;
          const steps  = Math.max(5, Math.floor(sec * 20));
          const start  = window.servoAngles[pin] != null ? window.servoAngles[pin] : 90;
          for (let i = 1; i <= steps; i++) {
            if (!window._runtimeRunning) return;
            const a = Math.round(start + (target - start) * (i / steps));
            await sendServo(pin, a);
            await new Promise(r => setTimeout(r, (sec * 1000) / steps));
          }
          return;
        }

        // ═══ 서보 attach (시뮬에선 로그만) ═══
        if (t === 'cubelink_servo_attach') {
          const pin = b.getFieldValue('PIN');
          appendSerialLog(`🔧 서보 핀 ${pin} 연결`);
          return;
        }

        // ═══ 딜레이 ═══
        if (t === 'cubelink_delay' || t === 'cubelink_v2_delay_ms') {
          const ms = parseInt(b.getFieldValue('MS'), 10) || 0;
          await new Promise(r => setTimeout(r, ms));
          return;
        }
        if (t === 'cubelink_delay_sec') {
          const sec = parseFloat(b.getFieldValue('SEC')) || 0;
          await new Promise(r => setTimeout(r, sec * 1000));
          return;
        }
        if (t === 'cubelink_delay_us') {
          // 마이크로초 단위는 브라우저에서 정확 제어 불가 → 최소 1ms로 변환
          const us = parseInt(b.getFieldValue('US'), 10) || 0;
          const ms = Math.max(1, Math.round(us / 1000));
          await new Promise(r => setTimeout(r, ms));
          return;
        }

        // ═══ pinMode (시뮬에선 로그만) ═══
        if (t === 'cubelink_pinmode') {
          const pin  = b.getFieldValue('PIN');
          const mode = b.getFieldValue('MODE');
          appendSerialLog(`🔧 pinMode(${pin}, ${mode})`);
          return;
        }

        // ═══ 디지털 출력 (LED 등) ═══
        if (t === 'cubelink_digitalwrite') {
          const pin = b.getFieldValue('PIN');
          const val = b.getFieldValue('VAL') === 'HIGH' ? 1 : 0;
          if (writer) await writer.write(enc.encode(`L,${pin},${val}\n`));
          // PIN 13 LED UI 반영
          if (pin === '13') {
            const led = document.getElementById('led13');
            if (led) led.style.background = val ? '#ff4444' : '#222';
          }
          appendSerialLog(`  L,${pin},${val}`);
          await new Promise(r => setTimeout(r, 20));
          return;
        }

        // ═══ 시리얼 통신 시작 ═══
        if (t === 'cubelink_serial_begin' || t === 'cubelink_v2_serial_begin') {
          const baud = b.getFieldValue('BAUD');
          appendSerialLog(`📡 시리얼 시작 (${baud} bps)`);
          return;
        }

        // ═══ 시리얼 출력 — 텍스트 ═══
        if (t === 'cubelink_serial_println_text') {
          appendSerialLog(`📤 ${b.getFieldValue('TEXT')}`);
          return;
        }

        // ═══ 시리얼 출력 — 숫자 ═══
        if (t === 'cubelink_serial_println_num') {
          appendSerialLog(`📤 ${b.getFieldValue('NUM')}`);
          return;
        }

        // ═══ 시리얼 출력 — 값(입력 슬롯) ═══
        if (t === 'cubelink_serial_println_value') {
          const inner = b.getInputTargetBlock('VAL');
          const v = inner ? evalValue(inner) : 0;
          appendSerialLog(`📤 ${v}`);
          return;
        }

        // ═══ 조이스틱 초기화 (구버전) cubelink_joystick_init ═══
        //   필드: NAME, VRX, VRY, SW
        if (t === 'cubelink_joystick_init') {
          const name = b.getFieldValue('NAME') || '왼쪽';
          const vrx  = b.getFieldValue('VRX');
          const vry  = b.getFieldValue('VRY');
          const sw   = b.getFieldValue('SW');
          appendSerialLog(`🕹 조이스틱(${name}) 초기화 VRx=${vrx} VRy=${vry} SW=${sw}`);
          if (writer) await writer.write(enc.encode(`J,INIT,${name},${vrx},${vry},${sw}\n`));
          return;
        }

        // ═══ 조이스틱 초기화 (v2) cubelink_v2_joystick_init ═══
        //   필드: JNAME, VRX, VRY, SW
        if (t === 'cubelink_v2_joystick_init') {
          const name = b.getFieldValue('JNAME') || '왼쪽';
          const vrx  = b.getFieldValue('VRX');
          const vry  = b.getFieldValue('VRY');
          const sw   = b.getFieldValue('SW');
          appendSerialLog(`🕹 v2 조이스틱(${name}) 초기화 VRx=${vrx} VRy=${vry} SW=${sw}`);
          if (writer) await writer.write(enc.encode(`J,INIT,${name},${vrx},${vry},${sw}\n`));
          return;
        }

        // ═══ 반복문 N회 ═══
        if (t === 'cubelink_repeat_n' || t === 'controls_repeat_ext') {
          let times = 0;
          if (t === 'controls_repeat_ext') {
            const inner = b.getInputTargetBlock('TIMES');
            times = parseInt(evalValue(inner), 10) || 0;
          } else {
            times = parseInt(b.getFieldValue('TIMES'), 10) || 0;
          }
          if (times > 1000) appendSerialLog(`⚠️ 반복 ${times}회 → 1000회로 제한`);
          const safeTimes = Math.min(times, 1000);
          const inner = chainToArray(b.getInputTargetBlock('DO'));
          for (let i = 0; i < safeTimes; i++) {
            if (!window._runtimeRunning) return;
            for (const ib of inner) {
              if (!window._runtimeRunning) return;
              await execBlock(ib);
            }
          }
          return;
        }

        // ═══ 조건문 if / elseif / else (Blockly 표준) ═══
        if (t === 'controls_if') {
          let idx = 0;
          let matched = false;
          while (true) {
            const condBlock = b.getInputTargetBlock('IF' + idx);
            if (!condBlock) break;
            const result = evalValue(condBlock);
            if (result) {
              const doBlock = b.getInputTargetBlock('DO' + idx);
              if (doBlock) {
                const arr = chainToArray(doBlock);
                for (const ib of arr) {
                  if (!window._runtimeRunning) return;
                  await execBlock(ib);
                }
              }
              matched = true;
              break;
            }
            idx++;
          }
          if (!matched) {
            const elseBlock = b.getInputTargetBlock('ELSE');
            if (elseBlock) {
              const arr = chainToArray(elseBlock);
              for (const ib of arr) {
                if (!window._runtimeRunning) return;
                await execBlock(ib);
              }
            }
          }
          return;
        }

        // ═══ 조건문 — controls_ifelse (블록 1개에 if+else 고정) ═══
        if (t === 'controls_ifelse') {
          const cond = evalValue(b.getInputTargetBlock('IF0'));
          const target = cond ? 'DO0' : 'ELSE';
          const arr = chainToArray(b.getInputTargetBlock(target));
          for (const ib of arr) {
            if (!window._runtimeRunning) return;
            await execBlock(ib);
          }
          return;
        }

        // ═══ v2 조건문 — cubelink_v2_if / cubelink_v2_if_else ═══
        //   입력: COND (Boolean), DO, ELSE
        if (t === 'cubelink_v2_if' || t === 'cubelink_v2_if_else') {
          const cond = evalValue(b.getInputTargetBlock('COND'));
          if (cond) {
            const arr = chainToArray(b.getInputTargetBlock('DO'));
            for (const ib of arr) {
              if (!window._runtimeRunning) return;
              await execBlock(ib);
            }
          } else if (t === 'cubelink_v2_if_else') {
            const arr = chainToArray(b.getInputTargetBlock('ELSE'));
            for (const ib of arr) {
              if (!window._runtimeRunning) return;
              await execBlock(ib);
            }
          }
          return;
        }

        // ═══ 변수 설정 ═══
        if (t === 'variables_set') {
          const field = b.getField('VAR');
          const name  = field ? field.getText() : b.getFieldValue('VAR');
          const inner = b.getInputTargetBlock('VALUE');
          window._userVars[name] = inner ? evalValue(inner) : 0;
          return;
        }

        // ═══ 변수 증감 ═══
        if (t === 'math_change') {
          const field = b.getField('VAR');
          const name  = field ? field.getText() : b.getFieldValue('VAR');
          const inner = b.getInputTargetBlock('DELTA');
          const delta = inner ? parseFloat(evalValue(inner)) || 0 : 0;
          const cur   = window._userVars[name] != null ? window._userVars[name] : 0;
          window._userVars[name] = cur + delta;
          return;
        }

        // 알 수 없는 블록 → 조용히 무시
      } catch (blockErr) {
        appendSerialLog(`❌ [${t}] 블록 실행 오류: ${blockErr.message}`);
        console.error('블록 실행 오류:', t, blockErr);
      }
    };

    const execChain = async (arr) => {
      for (const b of arr) {
        if (!window._runtimeRunning) return;
        await execBlock(b);
      }
    };

    try {
      const setupArr = chainToArray(setupChain);
      const loopArr  = chainToArray(loopChain);

      appendSerialLog("▶ setup 실행");
      await execChain(setupArr);

      if (loopArr.length > 0) {
        appendSerialLog("🔁 loop 시작");
        while (window._runtimeRunning) {
          loopCount++;

          // 안전 1: 총 반복 제한
          if (loopCount > MAX_TOTAL_LOOPS) {
            appendSerialLog(`🛑 안전 정지: 반복 ${MAX_TOTAL_LOOPS}회 초과`);
            break;
          }

          // 실제 loop 본문 실행
          const beforeBody = performance.now();
          await execChain(loopArr);
          const bodyDuration = performance.now() - beforeBody;

          // 안전 2: 매 루프 강제 yield + 너무 빠르면 자동 지연
          if (bodyDuration < 5) {
            await new Promise(r => setTimeout(r, 10));
          } else {
            await new Promise(r => setTimeout(r, 0));
          }

          // 안전 3: 빠른 루프 경고 (한 번만)
          const elapsedSec = (performance.now() - startTime) / 1000;
          if (!warnedTooFast && elapsedSec > 2 && (loopCount / elapsedSec) > 300) {
            appendSerialLog(`⚠️ loop가 너무 빠릅니다 (${Math.round(loopCount/elapsedSec)}회/초) — 'ms 기다리기' 블록 추가 권장`);
            warnedTooFast = true;
          }
        }
      }
      appendSerialLog("⏹ 실행 종료");
    } catch (e) {
      appendSerialLog(`❌ 실행 오류: ${e.message}`);
      console.error('runProgram 상세 오류:', e);
    } finally {
      window._runtimeRunning = false;
      if (btnRT) btnRT.textContent = originalText;
      try { if (writer) writer.releaseLock(); } catch(_) {}
      if (simStatusEl) { simStatusEl.textContent = '● 대기 중'; simStatusEl.classList.remove('running'); }
      const totalSec = ((performance.now() - startTime) / 1000).toFixed(1);
      appendSerialLog(`📊 총 ${loopCount}회 반복, ${totalSec}초 소요`);
    }
  }
  window.runProgram = runProgram;

  /* ============================================================
     버튼 이벤트
     ============================================================ */
  function setupButtonEvents() {
    document.getElementById('btnClear')?.addEventListener('click', () => {
      if (confirm('작성 중인 블록 코드를 모두 지우시겠습니까?')) {
        workspace.clear();
        setTimeout(triggerResize, 50);
      }
    });

    document.getElementById('btnReload')?.addEventListener('click', () => loadMission(currentMissionId));

    document.getElementById('btnClearSerial')?.addEventListener('click', () => {
      const sm = document.getElementById('serialMonitor');
      if (sm) sm.innerText = '';
    });

    document.getElementById('btnToggleSerial')?.addEventListener('click', (e) => {
      const bar = document.querySelector('.serial-monitor-bar');
      bar.classList.toggle('collapsed');
      e.target.innerText = bar.classList.contains('collapsed') ? '▲ 펼치기' : '▼ 접기';
      setTimeout(triggerResize, 150);
    });

    document.getElementById('btnRunRealtime')?.addEventListener('click', () => runProgram());

    document.getElementById('btnSimStart')?.addEventListener('click', () => {
      window._simulationOnly = true;
      runProgram();
    });

    document.getElementById('btnSimStop')?.addEventListener('click', () => {
      window._runtimeRunning = false;
      const status = document.getElementById('simStatus');
      if (status) { status.textContent = '● 정지됨'; status.classList.remove('running'); }
    });
  }

  function appendSerialLog(msg) {
    const sm = document.getElementById('serialMonitor');
    if (!sm) return;
    sm.innerText += msg + "\n";
    sm.scrollTop = sm.scrollHeight;
  }
  window.appendSerialLog = appendSerialLog;

  function triggerResize() {
    if (workspace && typeof Blockly !== 'undefined') {
      Blockly.svgResize(workspace);
      if (workspace.toolbox_ && typeof workspace.toolbox_.position === 'function') workspace.toolbox_.position();
    }
  }

  window.addEventListener('resize', triggerResize);
})();
