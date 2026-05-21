/**
 * CUBELINK Studio v2.7 - 메인 애플리케이션 제어 로직
 * 개선: 값 평가 엔진(evalValue) 추가 / 조건문·비교·산술·조이스틱 평가 지원
 *      안전장치 강화 (무한루프 자동 정지, 빠른 루프 자동 지연)
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
        { id: 7, title: "미션 7: 초음파 레이더 가동", desc: "초음파 센서(Trig 7 / Echo 6)를 활성화하여 전방의 물체까지의 거리를 cm 단위로 정밀하게 측정해 보세요.", hint: "거리를 읽어와 바로 시리얼 모니터에 출력하도록 루프문을 구성하여 센서 수치 변화를 관찰하세요." },
        { id: 8, title: "미션 8: 장애물 감지 자동 비상정지", desc: "만약 초음파 센서 거리가 15cm 이하로 좁혀지면 그리퍼 집게를 즉시 켜고 베이스를 정지하는 안전 매커니즘을 만드세요.", hint: "‘흐름 제어’의 ‘만약 ~ 이라면’ 블록과 ‘센서·아날로그’의 비교 연산자(<) 블록을 유기적으로 결합하세요." },
        { id: 9, title: "미션 9: CUBELINK 공장 자동화 프로젝트", desc: "조이스틱으로 물건을 집어 올린 후, 초음파 센서에 손을 대면 지정된 위치로 자동으로 물건을 이송하는 복합 매크로 코딩을 완성하세요.", hint: "지금까지 배운 모든 센서와 서보 블록을 총동원하여 융합 논리 회로를 설계하는 마스터 단계입니다." }
      ]
    }
  ];

  let workspace;
  let currentMissionId = 1;
  let activeTab = 'hint';

  // 가상 조이스틱 데이터 저장소 (실제 하드웨어 연결 시 덮어쓰기됨)
  window.joystickData = window.joystickData || {
    left:  { x: 500, y: 500, sw: 0 },
    right: { x: 500, y: 500, sw: 0 }
  };
  // 서보 현재각도 저장소
  window.servoAngles = window.servoAngles || { 6: 90, 9: 90, 10: 90, 11: 90 };

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
    window.resetHeaders && window.resetHeaders();

    const bodyCode = window.Arduino.workspaceToCode(workspace);

    let fullCode = `/**\n * CUBELINK Studio v2.7 Generated Source\n */\n`;
    if (window.headerExtras) {
      window.headerExtras.includes.forEach(inc => fullCode += `${inc}\n`);
      window.headerExtras.globals.forEach(gl => fullCode += `${gl}\n`);
      window.headerExtras.helpers.forEach(hp => fullCode += `${hp}\n\n`);
    }

    fullCode += `\nvoid setup() {\n  // 제품 초기화 및 설정\n`;
    const setupBlocks = workspace.getBlocksByType('arduino_setup_loop');
    if (setupBlocks.length > 0) {
      fullCode += window.Arduino.statementToCode(setupBlocks[0], 'SETUP');
    } else {
      fullCode += `  Serial.begin(9600);\n`;
    }
    fullCode += `}\n\nvoid loop() {\n`;
    if (setupBlocks.length > 0) {
      fullCode += window.Arduino.statementToCode(setupBlocks[0], 'LOOP');
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
      if (b.type === 'cubelink_servo_move_simple' || b.type === 'cubelink_servo_move' || b.type === 'cubelink_v2_servo_set') {
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
     값 평가 엔진 (evalValue) — 블록 트리를 순회하며 실제 값 반환
     ============================================================ */
  function evalValue(block) {
    if (!block) return 0;
    const t = block.type;

    try {
      // ─── 숫자/문자열 리터럴 ───
      if (t === 'math_number') {
        return parseFloat(block.getFieldValue('NUM')) || 0;
      }
      if (t === 'text') {
        return block.getFieldValue('TEXT') || '';
      }

      // ─── 산술 연산 ───
      if (t === 'math_arithmetic') {
        const op = block.getFieldValue('OP');
        const a = parseFloat(evalValue(block.getInputTargetBlock('A'))) || 0;
        const b = parseFloat(evalValue(block.getInputTargetBlock('B'))) || 0;
        switch (op) {
          case 'ADD':    return a + b;
          case 'MINUS':  return a - b;
          case 'MULTIPLY': return a * b;
          case 'DIVIDE': return b === 0 ? 0 : a / b;
          case 'POWER':  return Math.pow(a, b);
        }
        return 0;
      }

      // ─── 비교 연산 (<, >, =, ≠, ≤, ≥) ───
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

      // ─── 논리 연산 (and, or) ───
      if (t === 'logic_operation') {
        const op = block.getFieldValue('OP');
        const a = evalValue(block.getInputTargetBlock('A'));
        const b = evalValue(block.getInputTargetBlock('B'));
        return op === 'AND' ? (a && b) : (a || b);
      }
      if (t === 'logic_negate') {
        return !evalValue(block.getInputTargetBlock('BOOL'));
      }
      if (t === 'logic_boolean') {
        return block.getFieldValue('BOOL') === 'TRUE';
      }

      // ─── 조이스틱 X (전용 블록) ───
      if (t === 'cubelink_joystick_x') {
        const side = block.getFieldValue('SIDE') || block.getFieldValue('LR') 
                  || block.getFieldValue('STICK') || block.getFieldValue('TYPE') 
                  || block.getFieldValue('DIR') || 'left';
        const key = (side === 'right' || side === 'R' || side === '오른쪽') ? 'right' : 'left';
        return window.joystickData[key]?.x ?? 500;
      }

      // ─── 조이스틱 Y (전용 블록) ───
      if (t === 'cubelink_joystick_y') {
        const side = block.getFieldValue('SIDE') || block.getFieldValue('LR') 
                  || block.getFieldValue('STICK') || 'left';
        const key = (side === 'right' || side === 'R' || side === '오른쪽') ? 'right' : 'left';
        return window.joystickData[key]?.y ?? 500;
      }

      // ─── 조이스틱 SW (스위치 버튼) ───
      if (t === 'cubelink_joystick_sw') {
        const side = block.getFieldValue('SIDE') || block.getFieldValue('LR') || 'left';
        const key = (side === 'right' || side === 'R' || side === '오른쪽') ? 'right' : 'left';
        return window.joystickData[key]?.sw ?? 0;
      }

      // ─── 조이스틱 통합 read (axis 선택형) ───
      if (t === 'cubelink_joystick_read' || t === 'cubelink_joystick_value' || t === 'cubelink_joystick_axis') {
        const side = block.getFieldValue('SIDE') || block.getFieldValue('LR') || 'left';
        const axis = block.getFieldValue('AXIS') || 'X';
        const key = (side === 'right' || side === 'R' || side === '오른쪽') ? 'right' : 'left';
        const data = window.joystickData[key] || { x:500, y:500, sw:0 };
        if (axis === 'Y') return data.y;
        if (axis === 'SW') return data.sw;
        return data.x;
      }

      // ─── 서보 현재 각도 ───
      if (t === 'cubelink_servo_current' || t === 'cubelink_servo_get_angle' || t === 'cubelink_servo_read') {
        const pin = block.getFieldValue('PIN') 
                 || block.getFieldValue('SERVO') 
                 || block.getFieldValue('NUM') 
                 || block.getFieldValue('MOTOR');
        // UI 표시값 우선
        const span = document.getElementById('servoAngle' + pin);
        if (span) {
          const v = parseFloat(span.innerText);
          if (!isNaN(v)) return v;
        }
        return window.servoAngles[pin] != null ? window.servoAngles[pin] : 90;
      }

      // ─── map(value, fromLow, fromHigh, toLow, toHigh) ───
      if (t === 'cubelink_map' || t === 'sensor_map') {
        const v   = parseFloat(evalValue(block.getInputTargetBlock('VALUE'))) || 0;
        const fL  = parseFloat(evalValue(block.getInputTargetBlock('FROM_LOW')))  || 0;
        const fH  = parseFloat(evalValue(block.getInputTargetBlock('FROM_HIGH'))) || 1023;
        const tL  = parseFloat(evalValue(block.getInputTargetBlock('TO_LOW')))   || 0;
        const tH  = parseFloat(evalValue(block.getInputTargetBlock('TO_HIGH')))  || 180;
        if (fH === fL) return tL;
        return Math.round((v - fL) * (tH - tL) / (fH - fL) + tL);
      }

      // ─── 초음파 센서 (가상) ───
      if (t === 'cubelink_ultrasonic_read') {
        return window._ultrasonicValue != null ? window._ultrasonicValue : 100;
      }

      // ─── 변수 ───
      if (t === 'variables_get') {
        const name = block.getFieldValue('VAR');
        return (window._userVars && window._userVars[name] != null) ? window._userVars[name] : 0;
      }

      // ─── 알 수 없는 값 블록: 필드 NUM 시도 ───
      const numField = block.getFieldValue('NUM');
      if (numField != null) return parseFloat(numField) || 0;

    } catch (e) {
      console.warn('evalValue 오류:', t, e.message);
    }
    return 0;
  }

  /* ============================================================
     공통 실행 엔진 (실시간 + 시뮬레이션)
     ============================================================ */
  async function runProgram() {
    const simOnly = window._simulationOnly === true;
    window._simulationOnly = false;
    const port = window._serialPort;
    const useSerial = !simOnly && port && port.writable;

    // 안전장치
    let loopCount = 0;
    const MAX_TOTAL_LOOPS = 100000;
    let lastYieldTime = performance.now();
    let startTime = performance.now();
    let warnedTooFast = false;
    let lastLoopBodyTime = performance.now();

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

    // ─── 서보 전송 (공통) ───
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
          const pin = b.getFieldValue('PIN');
          const angle = safeAngle(pin, b.getFieldValue('ANGLE'), t);
          if (angle === null) return;
          await sendServo(pin, angle);
          appendSerialLog(`  S,${pin},${angle}`);
          await new Promise(r => setTimeout(r, 30));
          return;
        }

        // ═══ 서보 — 값 입력형 (내부 블록 평가) ═══
        if (t === 'cubelink_servo_move' || t === 'cubelink_v2_servo_set_value') {
          const pin = b.getFieldValue('PIN');
          const inner = b.getInputTargetBlock('ANGLE');
          let rawAngle = 90;
          if (inner) rawAngle = evalValue(inner);
          const angle = safeAngle(pin, rawAngle, t);
          if (angle === null) return;
          await sendServo(pin, angle);
          appendSerialLog(`  S,${pin},${angle}`);
          await new Promise(r => setTimeout(r, 30));
          return;
        }

        // ═══ 서보 — 부드럽게 (target 도달까지 보간) ═══
        if (t === 'cubelink_servo_smooth_simple' || t === 'cubelink_servo_smooth') {
          const pin = b.getFieldValue('PIN');
          let rawTarget;
          const angleField = b.getFieldValue('ANGLE');
          if (angleField != null) {
            rawTarget = angleField;
          } else {
            const inner = b.getInputTargetBlock('ANGLE');
            rawTarget = inner ? evalValue(inner) : 90;
          }
          const target = safeAngle(pin, rawTarget, t);
          if (target === null) return;
          const sec = parseFloat(b.getFieldValue('SEC')) || 1;
          const steps = Math.max(5, Math.floor(sec * 20));
          const start = window.servoAngles[pin] != null ? window.servoAngles[pin] : 90;
          for (let i = 1; i <= steps; i++) {
            if (!window._runtimeRunning) return;
            const a = Math.round(start + (target - start) * (i / steps));
            await sendServo(pin, a);
            await new Promise(r => setTimeout(r, (sec * 1000) / steps));
          }
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

        // ═══ LED / 디지털 출력 ═══
        if (t === 'cubelink_digitalwrite') {
          const pin = b.getFieldValue('PIN');
          const val = b.getFieldValue('VAL') === 'HIGH' ? 1 : 0;
          if (writer) await writer.write(enc.encode(`L,${pin},${val}\n`));
          appendSerialLog(`  L,${pin},${val}`);
          await new Promise(r => setTimeout(r, 20));
          return;
        }

        // ═══ 시리얼 출력 ═══
        if (t === 'cubelink_serial_print' || t === 'serial_println') {
          const inner = b.getInputTargetBlock('VAL') || b.getInputTargetBlock('TEXT');
          const text = inner ? evalValue(inner) : (b.getFieldValue('TEXT') || '');
          appendSerialLog(`📤 ${text}`);
          return;
        }

        // ═══ 조이스틱 초기화 ═══
        if (t === 'cubelink_joystick_begin' || t === 'cubelink_joystick_init') {
          const side = b.getFieldValue('SIDE') || 'left';
          const vrx = b.getFieldValue('VRX');
          const vry = b.getFieldValue('VRY');
          const sw  = b.getFieldValue('SW');
          appendSerialLog(`🕹 조이스틱(${side}) 초기화 VRx=${vrx} VRy=${vry} SW=${sw}`);
          if (writer) await writer.write(enc.encode(`J,INIT,${side},${vrx},${vry},${sw}\n`));
          return;
        }

        // ═══ 반복문 (N회) ═══
        if (t === 'cubelink_repeat_n' || t === 'controls_repeat_ext') {
          let times = 0;
          if (t === 'controls_repeat_ext') {
            const inner = b.getInputTargetBlock('TIMES');
            times = parseInt(evalValue(inner), 10) || 0;
          } else {
            times = parseInt(b.getFieldValue('TIMES'), 10) || 0;
          }
          if (times > 1000) {
            appendSerialLog(`⚠️ 반복 횟수 ${times}회 → 1000회로 제한`);
          }
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

        // ═══ 조건문 (if / elseif / else) ═══
        if (t === 'controls_if' || t === 'cubelink_if') {
          // elseif 가지 개수 추정
          let idx = 0;
          let matched = false;
          while (true) {
            const condBlock = b.getInputTargetBlock('IF' + idx);
            if (!condBlock) break;
            const condResult = evalValue(condBlock);
            if (condResult) {
              const doBlock = b.getInputTargetBlock('DO' + idx);
              if (doBlock) {
                const innerArr = chainToArray(doBlock);
                for (const ib of innerArr) {
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
              const innerArr = chainToArray(elseBlock);
              for (const ib of innerArr) {
                if (!window._runtimeRunning) return;
                await execBlock(ib);
              }
            }
          }
          return;
        }

        // ═══ 변수 설정 ═══
        if (t === 'variables_set') {
          if (!window._userVars) window._userVars = {};
          const name = b.getFieldValue('VAR');
          const inner = b.getInputTargetBlock('VALUE');
          window._userVars[name] = inner ? evalValue(inner) : 0;
          return;
        }

        // 알 수 없는 블록은 조용히 무시
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

          // 안전 2: 매 루프마다 강제 yield (무조건!)
          // 이게 핵심 — 사용자가 ms 기다리기를 안 넣어도 브라우저가 안 멈춤
          const beforeBody = performance.now();
          await execChain(loopArr);
          const afterBody = performance.now();
          const bodyDuration = afterBody - beforeBody;

          // 본문이 5ms 미만으로 너무 빨리 끝나면 자동 지연
          if (bodyDuration < 5) {
            await new Promise(r => setTimeout(r, 10));
          } else {
            // 그렇지 않아도 매 루프 최소 1ms yield 보장
            await new Promise(r => setTimeout(r, 0));
          }

          // 안전 3: 빠른 루프 경고 (한 번만)
          const elapsedSec = (performance.now() - startTime) / 1000;
          if (!warnedTooFast && elapsedSec > 2 && (loopCount / elapsedSec) > 300) {
            appendSerialLog(`⚠️ loop가 너무 빠릅니다 (${Math.round(loopCount/elapsedSec)}/초) — 'ms 기다리기' 블록 추가 권장`);
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
  window.evalValue  = evalValue;  // 디버깅용 노출

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
