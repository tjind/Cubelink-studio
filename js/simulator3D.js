/**
 * CUBELINK Studio - 3D 로봇팔 시뮬레이터
 * 5개 부품: base, lower, upper, grip01, grip02
 * 4축 서보: PIN 6(베이스 회전) / 9(하단 암) / 10(상단 암) / 11(그리퍼)
 */
(function () {
  'use strict';

  let scene, camera, renderer, controls;
  let robotGroup;
  const joints = {};
  let fingerLowerPivot, fingerUpperPivot;
  let containerEl;
  let initialized = false;
  let animId = null;

  const MODEL_BASE = 'models/';
  const MODELS = ['base', 'lower', 'upper', 'grip01', 'grip02'];

  /* ---------- 초기화 ---------- */
  function init() {
    if (initialized) return;
    containerEl = document.getElementById('robot-3d-view');
    if (!containerEl) { console.warn('[Sim] #robot-3d-view 컨테이너 없음'); return; }
    if (typeof THREE === 'undefined') { console.warn('[Sim] THREE 미로드'); return; }

    const w = containerEl.clientWidth || 400;
    const h = containerEl.clientHeight || 280;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
    camera.position.set(100, 150, 200);
    camera.lookAt(0, 8, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    containerEl.innerHTML = '';
    containerEl.appendChild(renderer.domElement);

    // 우클릭 컨텍스트 메뉴 차단 (OrbitControls pan 활성화)
    renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

    // 조명
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(10, 20, 10);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xD4AF37, 0.3);
    dir2.position.set(-10, 5, -10);
    scene.add(dir2);

    // 바닥 그리드
    const grid = new THREE.GridHelper(120, 60, 0xD4AF37, 0x555555);
    grid.position.y = -0.01;
    scene.add(grid);

    // 바닥 평면
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    scene.add(floor);

    // OrbitControls
    if (typeof THREE.OrbitControls === 'function') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 8, 0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 30;
      controls.maxDistance = 500;
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      };
      controls.update();
    }

    // 로봇 루트 그룹
    robotGroup = new THREE.Group();
    scene.add(robotGroup);

    // 로딩 표시용 임시 박스
    const placeholder = new THREE.Mesh(
      new THREE.BoxGeometry(2, 4, 2),
      new THREE.MeshStandardMaterial({ color: 0xD4AF37, wireframe: true })
    );
    placeholder.name = 'placeholder';
    placeholder.position.y = 2;
    robotGroup.add(placeholder);

    initialized = true;
    animate();
    window.addEventListener('resize', onResize);

    loadAllParts();
  }

  /* ---------- 렌더 루프 ---------- */
  function animate() {
    animId = requestAnimationFrame(animate);
    if (controls) controls.update();
    renderer.render(scene, camera);
  }

  function onResize() {
    if (!containerEl || !renderer || !camera) return;
    const w = containerEl.clientWidth;
    const h = containerEl.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  /* ---------- GLB 로드 ---------- */
  function loadAllParts() {
    if (typeof THREE.GLTFLoader !== 'function') {
      console.warn('[Sim] GLTFLoader 미로드');
      return;
    }
    const loader = new THREE.GLTFLoader();
    const parts = {};
    let loaded = 0;

    MODELS.forEach(name => {
      const url = `${MODEL_BASE}${name}.glb`;
      loader.load(
        url,
        (gltf) => {
          parts[name] = gltf.scene;
          parts[name].traverse(obj => {
            if (obj.isMesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
            }
          });
          loaded++;
          console.log(`[Sim] ✅ ${name}.glb 로드 (${loaded}/${MODELS.length})`);
          if (loaded === MODELS.length) {
            assemble(parts);
          }
        },
        undefined,
        (err) => {
          console.warn(`[Sim] ❌ ${name}.glb 로드 실패:`, err);
          loaded++;
          if (loaded === MODELS.length) assemble(parts);
        }
      );
    });
  }

  /* ---------- 로봇 조립 ---------- */
  function assemble(parts) {
    const ph = robotGroup.getObjectByName('placeholder');
    if (ph) robotGroup.remove(ph);

    if (!parts.base || !parts.lower || !parts.upper || !parts.grip01 || !parts.grip02) {
      console.warn('[Sim] 일부 부품 누락 — 조립 중단');
      return;
    }

    // ★★★ 순서 중요: joints[6]을 먼저 만들고, 그 안에 base를 넣어야 함 ★★★

    // 관절 6 (베이스 회전 — Y축)
    joints[6] = new THREE.Group();
    joints[6].position.set(0, 11, 0);
    robotGroup.add(joints[6]);

    // 베이스 → j6 안으로 (PIN 6 회전 시 바닥판도 같이 회전)
    parts.base.position.set(0, -11, 0);  // j6가 (0,11,0)에 있으니 base는 -11 보정
    joints[6].add(parts.base);

    // 관절 9 (하단 암 — Z축 피치)
    joints[9] = new THREE.Group();
    joints[9].position.set(0, 0, 0);
    joints[6].add(joints[9]);

    parts.lower.position.set(0, 0, 0);
    joints[9].add(parts.lower);

    // 관절 10 (상단 암 — Z축 피치)
    joints[10] = new THREE.Group();
    joints[10].position.set(-20, 75, 0);
    joints[9].add(joints[10]);

    parts.upper.position.set(20, -72, 0);
    joints[10].add(parts.upper);

    // 관절 11 (그리퍼 손목)
    joints[11] = new THREE.Group();
    joints[11].position.set(-40, -12, 0);
    joints[10].add(joints[11]);

    // 그리퍼 양쪽 집게 피벗
    fingerLowerPivot = new THREE.Group();
    fingerUpperPivot = new THREE.Group();
    fingerLowerPivot.position.set(0, 0, -1);
    fingerUpperPivot.position.set(0, 0,  1);
    joints[11].add(fingerLowerPivot);
    joints[11].add(fingerUpperPivot);

    parts.grip01.position.set(0, 0, -10);
    parts.grip02.position.set(0, 0,   7);
    fingerLowerPivot.add(parts.grip01);
    fingerUpperPivot.add(parts.grip02);

    // 외부 참조
    window.fingerLowerPivot = fingerLowerPivot;
    window.fingerUpperPivot = fingerUpperPivot;
    window.gripPart01 = parts.grip01;
    window.gripPart02 = parts.grip02;

    // tune 헬퍼 자동 등록
    registerTuneHelper(parts);

    // 초기 자세 90도
    setServoAngle(6, 90);
    setServoAngle(9, 90);
    setServoAngle(10, 90);
    setServoAngle(11, 90);

    console.log('[Sim] 🦾 로봇팔 조립 완료');
  }

  /* ---------- tune 헬퍼 자동 등록 ---------- */
  function registerTuneHelper(parts) {
    window.tune = {
      refs: () => ({
        j6: joints[6], j9: joints[9], j10: joints[10], j11: joints[11],
        base: parts.base,
        lower: parts.lower,
        upper: parts.upper,
        grip01: parts.grip01,
        grip02: parts.grip02,
        fingerLow: fingerLowerPivot,
        fingerUp: fingerUpperPivot
      }),
      pos: (n, x, y, z) => {
        const p = window.tune.refs()[n];
        if (!p) return console.warn(n + ' 없음');
        p.position.set(x, y, z);
        console.log(`✅ ${n}.pos = (${x}, ${y}, ${z})`);
      },
      rot: (n, xD, yD, zD) => {
        const p = window.tune.refs()[n];
        if (!p) return console.warn(n + ' 없음');
        p.rotation.set(xD * Math.PI / 180, yD * Math.PI / 180, zD * Math.PI / 180);
        console.log(`✅ ${n}.rot = (${xD}°, ${yD}°, ${zD}°)`);
      },
      show: () => {
        Object.entries(window.tune.refs()).forEach(([k, v]) => {
          if (!v) return console.log(`${k}: (없음)`);
          const p = v.position, r = v.rotation;
          console.log(`${k.padEnd(10)} pos(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}) rot(${(r.x * 180 / Math.PI).toFixed(1)}°, ${(r.y * 180 / Math.PI).toFixed(1)}°, ${(r.z * 180 / Math.PI).toFixed(1)}°)`);
        });
      },
      size: (n) => {
        const p = window.tune.refs()[n];
        if (!p) return console.warn(n + ' 없음');
        const b = new THREE.Box3().setFromObject(p);
        const s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
        console.log(`${n} 크기:(${s.x.toFixed(2)}, ${s.y.toFixed(2)}, ${s.z.toFixed(2)}) 중심:(${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)})`);
      }
    };
    console.log('🔧 tune 헬퍼 자동 등록 완료 (tune.show / tune.pos / tune.rot / tune.size)');
  }

  /* ---------- 서보 회전 ---------- */
  function setServoAngle(pin, angle) {
    const pId = parseInt(pin, 10);
    const a = parseFloat(angle);
    if (isNaN(a)) return;

    const group = joints[pId];
    const rad = (a - 90) * Math.PI / 180;

    if (group) {
      if (pId === 6) {
        group.rotation.y = rad;       // 베이스 좌우 회전
      } else if (pId === 9) {
        group.rotation.z = rad;       // 하단 암 피치
      } else if (pId === 10) {
        group.rotation.z = -rad;       // 상단 암 피치
      }
    }

    if (pId === 11) {
      // 그리퍼: 0=닫힘, 180=열림 (회전 폭 0.4로 확대)
      const gripRad = (a - 90) * Math.PI / 180 * 1.2;
      if (fingerLowerPivot) fingerLowerPivot.rotation.y = -gripRad;
      if (fingerUpperPivot) fingerUpperPivot.rotation.y =  gripRad;
    }

    // UI 갱신
    const angleSpan = document.getElementById('servoAngle' + pId);
    const fillBar   = document.getElementById('servoFill' + pId);
    if (angleSpan) angleSpan.innerText = Math.round(a);
    if (fillBar) fillBar.style.width = ((a / 180) * 100) + '%';
  }

  /* ---------- 외부 API ---------- */
  window.Sim = {
    init: init,
    setServoAngle: setServoAngle,
    setServo: setServoAngle,
    _internals: () => ({ scene, camera, renderer, robotGroup, joints, controls })
  };
})();
