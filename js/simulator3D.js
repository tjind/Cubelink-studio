/**
 * CUBELINK Studio - 4축 가상 로봇팔 3D 시뮬레이터 엔진
 * Three.js 라이브러리를 활용하여 실시간 관절 회전 및 센서 상태를 시각화합니다.
 */
(function() {
  'use strict';

  // 3D 공간 구성을 위한 전역 변수들
  let scene, camera, renderer, controls;
  let robotGroup;
  
  // 로봇팔의 각 관절(서보모터 뼈대)을 저장할 객체
  const joints = {
    6:  null, // PIN 6  · 베이스 회전 관절
    9:  null, // PIN 9  · 하단 암 관절
    10: null, // PIN 10 · 상단 암 관절
    11: null  // PIN 11 · 그리퍼 집게 관절
  };

  // 외부 사령탑(app.js)에서 접근할 수 있도록 window.Sim 전역 객체 생성
  window.Sim = {
    // 3D 엔진 초기화 함수
    init: function() {
      const container = document.getElementById('robot-3d-view');
      if (!container) return;

      // 1. 3D 가상 세계(Scene) 생성
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0a); // CUBELINK 다크 매트 배경

      // 2. 가상 카메라 배치 (시야각 45도)
      camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
      camera.position.set(20, 20, 25);

      // 3. 그래픽 렌더러 생성 및 컨테이너 바인딩
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.shadowMap.enabled = true;
      container.appendChild(renderer.domElement);

      // 4. 마우스나 터치 제어로 화면을 돌려볼 수 있는 OrbitControls 연결
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 2 - 0.05; // 땅바닥 밑으로 카메라가 못 내려가게 제약

      // 5. 조명 배치 (입체감을 극대화하는 은은한 골드빛 조명 조화)
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xfff5e6, 0.8);
      dirLight.position.set(10, 20, 10);
      dirLight.castShadow = true;
      scene.add(dirLight);

      const pointLight = new THREE.PointLight(0xD4AF37, 0.5, 30);
      pointLight.position.set(-10, 10, -10);
      scene.add(pointLight);

      // 6. 무대 바닥 그리드 격자판 깔기
      const gridHelper = new THREE.GridHelper(30, 30, 0xD4AF37, 0x222222);
      gridHelper.position.y = -0.01;
      scene.add(gridHelper);

      // 7. 로봇팔 전체를 묶어줄 그룹 생성
      robotGroup = new THREE.Group();
      scene.add(robotGroup);

      // 우선 3D 모델 파일을 불러오기 전, 빈 박스로 뼈대를 즉시 세워둡니다.
      this.buildFallbackRobot();

      // 실제 GLTF/GLB 3D 파일이 폴더에 있다면 로드를 시도합니다.
      this.loadRobotModel();

      // 8. 윈도우 크기가 바뀔 때 3D 창 화면 비율 자동 맞춤 설정
      window.addEventListener('resize', onWindowResize, false);

      // 9. 3D 애니메이션 루프 가동
      animate();
      console.log('[3D Sim] 로봇팔 3D 그래픽 엔진이 정상 기동되었습니다.');
    },

    // 3D 파일이 없거나 깨졌을 때를 대비한 '상자형 디자인 교구' 입체 구현 로직
    buildFallbackRobot: function() {
      // 모든 재질에 고급스러운 반무광 블랙 코팅 입힘
      const material = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.5, metalness: 0.7 });
      const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xD4AF37, roughness: 0.3, metalness: 0.8 });

      // [관절 6 : 베이스 받침대]
      const baseGeo = new THREE.CylinderGeometry(3, 3.2, 1, 16);
      const baseMesh = new THREE.Mesh(baseGeo, material);
      baseMesh.position.y = 0.5;
      robotGroup.add(baseMesh);

      // [관절 9 : 하단 어깨부 회전 축]
      joints[6] = new THREE.Group();
      joints[6].position.set(0, 1, 0);
      robotGroup.add(joints[6]);

      const shoulderGeo = new THREE.BoxGeometry(2, 1.5, 2);
      const shoulderMesh = new THREE.Mesh(shoulderGeo, goldMaterial);
      shoulderMesh.position.y = 0.75;
      joints[6].add(shoulderMesh);

      // [관절 10 : 하단 암 뼈대]
      joints[9] = new THREE.Group();
      joints[9].position.set(0, 1.5, 0);
      joints[6].add(joints[9]);

      const lowerArmGeo = new THREE.BoxGeometry(0.8, 5, 0.8);
      const lowerArmMesh = new THREE.Mesh(lowerArmGeo, material);
      lowerArmMesh.position.y = 2.5; // 중심축 보정
      joints[9].add(lowerArmMesh);

      // [관절 11 : 상단 팔꿈치 관절]
      joints[10] = new THREE.Group();
      joints[10].position.set(0, 5, 0);
      joints[9].add(joints[10]);

      const upperArmGeo = new THREE.BoxGeometry(0.6, 4, 0.6);
      const upperArmMesh = new THREE.Mesh(upperArmGeo, material);
      upperArmMesh.position.y = 2;
      joints[10].add(upperArmMesh);

      // [그리퍼 집게 손]
      joints[11] = new THREE.Group();
      joints[11].position.set(0, 4, 0);
      joints[10].add(joints[11]);

      const handGeo = new THREE.BoxGeometry(1.2, 0.8, 1.2);
      const handMesh = new THREE.Mesh(handGeo, goldMaterial);
      handMesh.position.y = 0.4;
      joints[11].add(handMesh);
      
      // 최초 기본 정렬 각도 (모두 차렷 자세인 90도 정렬)
      this.setServoAngle(6, 90);
      this.setServoAngle(9, 90);
      this.setServoAngle(10, 90);
      this.setServoAngle(11, 90);
    },

    // models 폴더에 저장된 진짜 오리지널 .glb 기기 파일 매칭 로드 함수
    loadRobotModel: function() {
      const loader = new THREE.GLTFLoader();
      // 수호님의 3D 모델 파일 경로 연동 (파일명이 다를 경우 교체 가능)
      loader.load('models/robot_arm.glb', function(gltf) {
        // 실제 화려한 모델 로드에 성공하면 기존 박스 모델 그룹을 비우고 교체합니다.
        while(robotGroup.children.length > 0){
          robotGroup.remove(robotGroup.children[0]);
        }
        const model = gltf.scene;
        robotGroup.add(model);
        
        // 모델 내부의 구조에 따라 관절들을 새로 매핑해줍니다.
        // (gltf 내부 노드 탐색 매핑 코드는 향후 모델링 맞춤 커스텀 영역)
        console.log('[3D Sim] 오리지널 GLB 3D 기기 파일 모델 로드 완료');
      }, undefined, function(error) {
        console.log('[3D Sim] GLB 파일이 없거나 로드할 수 없어 기본 박스 교구 모드로 작동합니다.');
      });
    },

    // 뇌(app.js)에서 "서보모터 핀 X번 몇 도로 움직여!" 하고 호출하는 함수
    setServoAngle: function(pin, angle) {
      const group = joints[pin];
      if (!group) return;

      // 입력된 아두이노 각도(0~180도)를 3D 공간의 라디안 회전각으로 변환
      const rad = (angle - 90) * (Math.PI / 180);

      // 4축 관절별 물리 회전축 매핑 지정
      if (parseInt(pin) === 6) {
        group.rotation.y = -rad; // 좌우 회전
      } else if (parseInt(pin) === 9) {
        group.rotation.z = rad;  // 앞뒤 굽히기
      } else if (parseInt(pin) === 10) {
        group.rotation.z = rad;  // 팔꿈치 굽히기
      } else if (parseInt(pin) === 11) {
        group.rotation.y = rad;  // 그리퍼 회전 손가락
      }

      // 화면 우측 탭 하단의 미니 계기판 배출 정보 동시 수정
      const angleSpan = document.getElementById(`servoAngle${pin}`);
      const fillBar = document.getElementById(`servoFill${pin}`);
      if (angleSpan) angleSpan.innerText = angle;
      if (fillBar) {
        const pct = (angle / 180) * 100;
        fillBar.style.width = pct + '%';
      }
    }
  };

  // 렌더러 프레임 갱신 애니메이션 루프
  function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (scene && camera && renderer) {
      renderer.render(scene, camera);
    }
  }

  // 화면 크기 반응형 자동 보정 조절 함수
  function onWindowResize() {
    const container = document.getElementById('robot-3d-view');
    if (!container || !camera || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

})();