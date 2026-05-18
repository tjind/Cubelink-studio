/**
 * CUBELINK Studio - 메인 애플리케이션 총사령탑 제어 로직
 * Blockly 워크스페이스, 미션 시스템, 시리얼 통신 및 3D 엔진을 통합 제어합니다.
 */
(function() {
  'use strict';

  // 1. 단계별 미션 커리큘럼 데이터 정의 (기초 ➡️ 심화)
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
  let serialPort = null;
  let serialWriter = null;

  // 2. 앱 실행 시 부품들 동시 기동 및 바인딩
  document.addEventListener('DOMContentLoaded', () => {
    // 3D 시뮬레이터 가동
    if (window.Sim && typeof window.Sim.init === 'function') {
      window.Sim.init();
    }

    // Blockly 워크스페이스 조립 가동 (블랙&골드 다크 모드 렌더링 스타일)
    workspace = Blockly.inject('blocklyDiv', {
      toolbox: document.getElementById('toolbox'),
      grid: { spacing: 20, length: 3, colour: '#222', snap: true },
      trashcan: true,
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 }
    });

    // 블록 배치 조작 시마다 C++ 코드 자동 변환 연동 리스너 설정
    workspace.addChangeListener(updateCppCodeView);

    // 인터페이스 바인딩 초기화
    renderCurriculumMenu();
    setupTabEvents();
    setupButtonEvents();
    loadMission(1); // 1번 기본 미션 자동 로드
  });

  // 3. 단계별 미션 아코디언 메뉴 동적 생성 및 바인딩
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

  // 4. 선택된 미션의 안내 문구 및 힌트를 화면에 주입하는 함수
  function loadMission(id) {
    currentMissionId = id;
    let target = null;
    CURRICULUM.forEach(g => g.missions.forEach(m => { if (m.id === id) target = m; }));
    if (!target) return;

    // 활성화 스타일 클래스 변경
    document.querySelectorAll('.mission-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById(`mItem-${id}`);
    if (activeEl) activeEl.classList.add('active');

    // 뼈대 텍스트 교체
    document.getElementById('missionTitle').innerText = target.title;
    document.getElementById('missionDesc').innerText = target.desc;
    document.getElementById('hintPanel').innerHTML = `
      <div style="padding:10px; border-left:4px solid var(--gold); background:var(--charcoal-2); border-radius:4px;">
        <h4 style="margin:0 0 8px 0; color:var(--gold);">💡 미션 성공 가이드</h4>
        ${target.hint}
      </div>
    `;

    // 새 미션을 열었을 때는 우선 힌트 탭으로 강제 포커싱
    switchTab('hint');
    workspace.clear(); // 이전 코딩 판 비우기
  }

  // 5. 블록 코딩 결합 시 C++ 텍스트 코드로 실시간 번역 연동 함수
  function updateCppCodeView() {
    if (!workspace || !window.Arduino) return;
    window.resetHeaders(); // 헤더 정보 초기화

    // 블록 무대 전체를 C++ 구문으로 변환
    const bodyCode = window.Arduino.workspaceToCode(workspace);
    
    // 조립된 동적 인클루드 및 전역 변수 병합 처리
    let fullCode = `/**\n * CUBELINK Studio v2.6.5 Generated Source\n */\n`;
    window.headerExtras.includes.forEach(inc => fullCode += `${inc}\n`);
    window.headerExtras.globals.forEach(gl => fullCode += `${gl}\n`);
    window.headerExtras.helpers.forEach(hp => fullCode += `${hp}\n\n`);

    fullCode += `\nvoid setup() {\n`;
    fullCode += `  // 제품 초기화 및 설정\n`;
    
    // 블록 내부 setup 구문 추출 분기
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
    
    // 3D 가상 시뮬레이터 연동 각도 파싱 추적 가동
    syncBlocksTo3D();
  }

  // 블록의 실시간 수치를 가상 3D 관절 모델로 그대로 투영
  function syncBlocksTo3D() {
    if (!workspace) return;
    // 무대에 올라온 모든 서보 모터 제어 블록을 서치하여 각도값 강제 연동
    const allBlocks = workspace.getAllBlocks(false);
    allBlocks.forEach(b => {
      if (b.type === 'cubelink_servo_move_simple' || b.type === 'cubelink_v2_servo_set') {
        const pin = b.getFieldValue('PIN');
        const val = parseFloat(b.getFieldValue('ANGLE')) || 90;
        if (window.Sim && typeof window.Sim.setServoAngle === 'function') {
          window.Sim.setServoAngle(pin, val);
        }
      }
    });
  }

  // 6. 우측 패널 탭 전환 이벤트 바인딩
  function setupTabEvents() {
    document.querySelectorAll('.tabs .tab').forEach(t => {
      t.addEventListener('click', () => {
        switchTab(t.getAttribute('data-tab'));
      });
    });
  }

  function switchTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll('.tabs .tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-body').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-body') === tabId);
    });
    
    // 시뮬레이터나 코드 창으로 탭 전환 시 화면 왜곡 깨짐 방지 자동 리사이즈 트리거
    if (tabId === 'sim' && window.Sim) {
      window.dispatchEvent(new Event('resize'));
    }
  }

  // 7. 제어 버튼 일체형 이벤트 연결
  function setupButtonEvents() {
    // 코딩판 지우기 및 초기화 버튼들
    document.getElementById('btnClear')?.addEventListener('click', () => {
      if (confirm('작성 중인 블록 코드를 모두 지우시겠습니까?')) workspace.clear();
    });
    document.getElementById('btnReload')?.addEventListener('click', () => loadMission(currentMissionId));
    document.getElementById('btnClearSerial')?.addEventListener('click', () => {
      const sm = document.getElementById('serialMonitor');
      if (sm) sm.innerText = '';
    });

    // 시리얼 모니터 창 접기/펼치기
    document.getElementById('btnToggleSerial')?.addEventListener('click', (e) => {
      const bar = document.querySelector('.serial-monitor-bar');
      bar.classList.toggle('collapsed');
      e.target.innerText = bar.classList.contains('collapsed') ? '▲ 펼치기' : '▼ 접기';
    });

    // [핵심 기능 1] 🔌 로봇 연결 및 초기화 (OTG 하드웨어 통신 가동)
    document.getElementById('btnConnectInit')?.addEventListener('click', async () => {
      try {
        appendSerialLog("[System] 로봇 장치 검색 및 하드웨어 통신을 시도합니다...");
        
        // 폴리필(안드로이드) 혹은 크롬(PC)의 Web Serial API를 통합 호출합니다.
        serialPort = await navigator.serial.requestPort();
        await serialPort.open({ baudRate: 9600 });
        
        serialWriter = serialPort.writable.getWriter();
        appendSerialLog("✅ [Connected] 로봇팔과 연결되었습니다. 모든 모터를 90도 각도로 정렬합니다.");
        
        // 4축 모터를 순차적으로 차렷 자세(90도) 전송 패킷 릴레이 전송
        await sendSerialCommand("SV6A90\n");
        await sendSerialCommand("SV9A90\n");
        await sendSerialCommand("SV10A90\n");
        await sendSerialCommand("SV11A90\n");
        
        // 3D 가상 공간 모델도 동시 동기화
        if (window.Sim) {
          window.Sim.setServoAngle(6, 90);
          window.Sim.setServoAngle(9, 90);
          window.Sim.setServoAngle(10, 90);
          window.Sim.setServoAngle(11, 90);
        }
      } catch (err) {
        console.error(err);
        appendSerialLog(`❌ [Error] 연결 실패: ${err.message}`);
        alert(`장치를 연결할 수 없습니다.\nOTG 젠더 연결과 전원 상태를 확인하세요.`);
      }
    });

    // [핵심 기능 2] ▶ 실시간 동작 실행 버튼 바인딩
    document.getElementById('btnRunRealtime')?.addEventListener('click', async () => {
      if (!serialWriter) {
        alert("먼저 '🔌 로봇 연결 및 초기화' 버튼을 눌러 하드웨어를 연결해 주세요.");
        return;
      }
      
      appendSerialLog("[Run] 현재 조립된 블록 명령 패킷을 기기로 실시간 스트리밍합니다...");
      
      // 현재 배치된 모터 블록의 수치를 추출하여 패킷 전송
      const allBlocks = workspace.getAllBlocks(false);
      for (const b of allBlocks) {
        if (b.type === 'cubelink_servo_move_simple' || b.type === 'cubelink_v2_servo_set') {
          const pin = b.getFieldValue('PIN');
          const angle = parseFloat(b.getFieldValue('ANGLE')) || 90;
          
          // 전송 프로토콜 패킷 빌드 (예: SV6A120\n)
          const cmd = `SV${pin}A${angle}\n`;
          await sendSerialCommand(cmd);
          appendSerialLog(`▶ 송신 명령어: ${cmd.trim()}`);
          
          // 모터 구동 시간 확보를 위한 마이크로 타임 딜레이
          await new Promise(r => setTimeout(r, 150));
        }
      }
      appendSerialLog("✅ [Run Done] 모든 명령이 전달되었습니다.");
    });
  }

  // 직렬 포트 스트림 스트리밍 문자열 패킷 전송 헬퍼 함수
  async function sendSerialCommand(text) {
    if (!serialWriter) return;
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    await serialWriter.write(data);
  }

  // 로그 메인 화면 시리얼 터미널 텍스트 박스 출력 함수
  function appendSerialLog(msg) {
    const sm = document.getElementById('serialMonitor');
    if (!sm) return;
    sm.innerText += msg + "\n";
    sm.scrollTop = sm.scrollHeight; // 스크롤 항시 맨 아래 고정
  }

})();