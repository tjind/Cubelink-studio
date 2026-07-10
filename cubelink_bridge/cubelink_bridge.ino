/*
 * ============================================================
 *  CUBELINK Bridge Firmware v1.3.1
 *  ─────────────────────────────────────────────
 *  v1.2 → v1.3 핵심 변경 (자율 모드 진입 방식 전면 교체):
 *   • [제거] PC_TIMEOUT 기반 자동 자율 모드 진입 (타이밍 버그 원인)
 *       - USB만 꽂고 웹앱 연결 전이라도 자율 모드로 오인 진입하던 문제 해결
 *   • [신규] 드론식 ARMING: 양쪽 스틱을 "대각선 아래 바깥"으로 2초 홀드 시 자율 모드 시동
 *       - 왼쪽 스틱  대각선 아래 = -Y(작아짐) + X(커짐)
 *       - 오른쪽 스틱 대각선 아래 = +Y(커짐)  + X(커짐)
 *   • [신규] DISARM: 자율 모드 중 30초 무동작 시 자동 해제, 또는 USB 명령 수신 시 즉시 해제
 *   • 시동/해제 시 LED 패턴으로 사용자에게 알림
 *  ─────────────────────────────────────────────
 *  유지된 v1.2 기능:
 *   • 조이스틱 중립값 자동 캘리브레이션
 *   • 관절별 안전 각도 제한(SAFE LIMIT) 상단 분리
 *   • 부팅 시 4축 순차 정렬
 *   • P → PONG 응답, 알 수 없는 명령 안전 무시
 *  ─────────────────────────────────────────────
 *  동작 요약:
 *   - 기본 상태 = 실시간 대기(IDLE). PC 명령(S/L) 오면 실시간 제어.
 *   - 자율 모드는 "오직 ARMING 동작"으로만 진입 → 타이밍과 무관.
 *   - 웹앱은 1초마다 P(ping)를 보내 연결 유지(선택).
 * ============================================================
 */

#include <Servo.h>

// ───────────────── 핀 정의 ─────────────────
const uint8_t PIN_BASE     = 6;   // 베이스 (MG90S)
const uint8_t PIN_LOWER    = 9;   // 하완   (MG90S)
const uint8_t PIN_UPPER    = 10;  // 상완   (SG90)
const uint8_t PIN_GRIPPER  = 11;  // 그리퍼 (SG90)

const uint8_t PIN_TRIG     = 4;
const uint8_t PIN_ECHO     = 5;
const uint8_t PIN_LED      = 13;

const uint8_t PIN_JOY1_X   = A0;  // 왼쪽 X
const uint8_t PIN_JOY1_Y   = A1;  // 왼쪽 Y
const uint8_t PIN_JOY1_SW  = 2;

const uint8_t PIN_JOY2_X   = A2;  // 오른쪽 X
const uint8_t PIN_JOY2_Y   = A3;  // 오른쪽 Y
const uint8_t PIN_JOY2_SW  = 7;

// ═══════════════ 관절별 안전 각도 제한 ═══════════════
//  ★ 실험하면서 이 값만 고치면 됩니다 (실시간·자율 공통) ★
const int BASE_MIN    = 0,   BASE_MAX    = 180;
const int LOWER_MIN   = 0,   LOWER_MAX   = 180;
const int UPPER_MIN   = 0,   UPPER_MAX   = 180;
const int GRIPPER_MIN = 50,  GRIPPER_MAX = 120;  // 그리퍼: 조사 중(보수값)
// ════════════════════════════════════════════════════

// ───────────────── 서보 객체 ─────────────────
Servo servoBase, servoLower, servoUpper, servoGripper;
int lastAngle[12];

// ───────────────── 통신 버퍼 ─────────────────
const uint8_t BUF_SIZE = 24;
char  rxBuf[BUF_SIZE];
uint8_t rxLen = 0;

// ───────────────── 송신 주기 ─────────────────
unsigned long tUltrasonic = 0;
unsigned long tJoystick   = 0;
const unsigned long PERIOD_US   = 80;
const unsigned long PERIOD_JOY  = 50;

const int JOY_DEADZONE = 8;
int lastJ1x = -999, lastJ1y = -999, lastJ1sw = -1;
int lastJ2x = -999, lastJ2y = -999, lastJ2sw = -1;

// ═══════════════ 자율 모드 (v1.3 ARMING 방식) ═══════════════
bool autoMode = false;                  // 현재 자율 모드 여부
bool autoReady = false;                 // v1.3.1: 스틱이 중립으로 돌아온 후에만 제어 시작
bool armEnabled = false;                // v1.3.1: 스틱이 한 번 중립을 거쳐야 ARM 감시 시작 (부팅 오진입 방지)

// 자율 모드 서보 이동
unsigned long tAutoMove = 0;
const unsigned long AUTO_STEP_PERIOD = 15;   // 15ms마다 1도
int curBase = 90, curLower = 90, curUpper = 90, curGripper = 90;

// 조이스틱 중립값 캘리브레이션
int centerJ1x = 512, centerJ1y = 512;
int centerJ2x = 512, centerJ2y = 512;
const int JOY_THRESHOLD = 120;          // 자율 제어 동작 임계값 (중립 대비)

// ─── ARMING(시동) 파라미터 ───
//  실물에서 스틱을 끝까지 밀어도 이 값에 못 미치면 ARM_EDGE를 낮추세요
const int ARM_EDGE = 250;               // 중립(약512)에서 이만큼 벗어나면 "끝까지 민 것"
const unsigned long ARM_HOLD_TIME = 2000;   // 2초 홀드
unsigned long armHoldStart = 0;
bool armPosePrev = false;

// ─── DISARM(해제) 파라미터 ───
const unsigned long AUTO_IDLE_TIMEOUT = 30000;  // 30초 무동작 시 자동 해제
unsigned long lastAutoActivity = 0;

// LED 알림용
unsigned long tLedNotify = 0;
int ledNotifyCount = 0;
// ════════════════════════════════════════════════════════════

// ============================================
//  setup
// ============================================
void setup() {
  Serial.begin(115200);

  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_JOY1_SW, INPUT_PULLUP);
  pinMode(PIN_JOY2_SW, INPUT_PULLUP);

  for (uint8_t i = 0; i < 12; i++) lastAngle[i] = 90;

  // 부팅 시 4축 "순차" 정렬 (동시 전류 피크 완화)
  servoBase.attach(PIN_BASE);       servoBase.write(90);    delay(200);
  servoLower.attach(PIN_LOWER);     servoLower.write(90);   delay(200);
  servoUpper.attach(PIN_UPPER);     servoUpper.write(90);   delay(200);
  servoGripper.attach(PIN_GRIPPER); servoGripper.write(90); delay(200);

  digitalWrite(PIN_LED, HIGH);   // 기본(실시간 대기) = LED 켜짐

  delay(300);
  sendReady();
}

// ============================================
//  loop
// ============================================
void loop() {
  readSerial();

  if (!autoMode) {
    // ── 실시간 대기/제어 모드 (기본 상태) ──
    sendUltrasonicIfDue();
    sendJoysticksIfDue();
    checkArming();          // 시동 자세 감시 → 조건 충족 시 자율 모드 진입
  } else {
    // ── 자율 조이스틱 모드 ──
    runAutoJoystick();
    checkDisarm();          // 30초 무동작 시 자동 해제
  }

   serviceLedNotify();   // ★ 추가: 모드 무관하게 LED 알림 처리
}

// ============================================
//  시리얼 수신
// ============================================
void readSerial() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (rxLen > 0) {
        rxBuf[rxLen] = '\0';
        handleCommand(rxBuf);
        rxLen = 0;
      }
    } else if (rxLen < BUF_SIZE - 1) {
      rxBuf[rxLen++] = c;
    } else {
      rxLen = 0;
    }
  }
}

void handleCommand(const char* line) {
  char cmd = line[0];

  // v1.3: USB 명령(S/L)이 오면 자율 모드 즉시 해제 (실시간 우선)
  if (autoMode && (cmd == 'S' || cmd == 'L')) {
    disarmAuto();
  }

  if (cmd == 'S') {
    int pin, angle;
    if (parseTwoInts(line + 1, pin, angle)) {
      moveServo(pin, angle);
      syncCurAngle(pin, angle);
    }
  }
  else if (cmd == 'L') {
    int pin, val;
    if (parseTwoInts(line + 1, pin, val)) {
      if (pin == PIN_LED) {              // ★ LED(13)만 허용
      digitalWrite(pin, val ? HIGH : LOW);
      }
    }
  }
  else if (cmd == 'P') {
    Serial.println(F("PONG,CUBELINK,v1.3.1"));
  }
  // 그 외 알 수 없는 명령은 안전하게 무시 (전방 호환성)
}

bool parseTwoInts(const char* s, int& a, int& b) {
  while (*s == ',' || *s == ' ') s++;
  if (!*s) return false;
  a = atoi(s);
  while (*s && *s != ',') s++;
  if (*s != ',') return false;
  s++;
  b = atoi(s);
  return true;
}

// ============================================
//  v1.3: ARMING (시동) 감시 — 실시간 대기 중에만 호출
//  조건: 양쪽 스틱 모두 "대각선 아래 바깥"으로 끝까지 + 2초 홀드
//
//  [방향 확정 — 선생님 측정값]
//   왼쪽 스틱  대각선 아래 = -Y(작아짐) + X(커짐)
//   오른쪽 스틱 대각선 아래 = +Y(커짐)  + X(커짐)
// ============================================
void checkArming() {
  int x1 = analogRead(PIN_JOY1_X);
  int y1 = analogRead(PIN_JOY1_Y);
  int x2 = analogRead(PIN_JOY2_X);
  int y2 = analogRead(PIN_JOY2_Y);

  // v1.3.1: 부팅 오진입 방지 — 스틱이 한 번 중립을 거쳐야 ARM 감시 시작
  if (!armEnabled) {
    bool allCentered =
        (abs(x1 - 512) < JOY_THRESHOLD) && (abs(y1 - 512) < JOY_THRESHOLD) &&
        (abs(x2 - 512) < JOY_THRESHOLD) && (abs(y2 - 512) < JOY_THRESHOLD);
    if (allCentered) armEnabled = true;   // 중립 확인됨 → 이제부터 ARM 감시 허용
    digitalWrite(PIN_LED, HIGH);          // 대기 LED 유지
    armPosePrev = false;
    return;                               // 아직 ARM 감시 안 함
  }

  // 왼쪽: X 커짐(+X) + Y 작아짐(-Y)
  bool leftCorner  = (x1 > 512 + ARM_EDGE) && (y1 < 512 - ARM_EDGE);
  // 오른쪽: X 커짐(+X) + Y 커짐(+Y)
  bool rightCorner = (x2 > 512 + ARM_EDGE) && (y2 > 512 + ARM_EDGE);

  bool armPose = leftCorner && rightCorner;

  unsigned long now = millis();

  if (armPose) {
    if (!armPosePrev) {
      armHoldStart = now;          // 시동 자세 시작
    } else if (now - armHoldStart >= ARM_HOLD_TIME) {
      armAuto();                   // 2초 유지 → 시동!
    }
    digitalWrite(PIN_LED, (now / 100) % 2 ? HIGH : LOW);  // 홀드 중 빠른 깜빡
  } else {
    digitalWrite(PIN_LED, HIGH);   // 자세 풀리면 대기 LED 복귀
  }
  armPosePrev = armPose;
}

// 자율 모드 진입
void armAuto() {
  autoMode = true;
  armPosePrev = false;

  // v1.3.1: 현재 각도 → 90도까지 부드럽게 보간 이동
  int b = lastAngle[PIN_BASE];
  int l = lastAngle[PIN_LOWER];
  int u = lastAngle[PIN_UPPER];
  int g = lastAngle[PIN_GRIPPER];     

  // 모든 축이 90에 도달할 때까지 1도씩 동시 접근 (속도 제한 → 전류 완화)
  bool done = false;
  while (!done) {
    done = true;
    if (b != 90) { b += (b < 90) ? 1 : -1; servoBase.write(b);    done = false; }
    if (l != 90) { l += (l < 90) ? 1 : -1; servoLower.write(l);   done = false; }
    if (u != 90) { u += (u < 90) ? 1 : -1; servoUpper.write(u);   done = false; }
    if (g != 90) { g += (g < 90) ? 1 : -1; servoGripper.write(g); done = false; }
    delay(12);   // 한 스텝 간격 (작을수록 빠름, 클수록 부드럽고 전류 낮음)
  }

  curBase = 90; curLower = 90; curUpper = 90; curGripper = 90;
  autoReady = false;
  lastAutoActivity = millis();
  ledNotify(3);
}


// 자율 모드 해제
void disarmAuto() {
  autoMode = false;
  armPosePrev = false;
  autoReady = false;                // v1.3.1: 다음 진입 시 다시 중립 대기
  armEnabled = false;               // v1.3.1: 다음 진입도 중립 확인 후 ARM 감시
  digitalWrite(PIN_LED, HIGH);
  ledNotify(2);                     // 해제 알림: 2회 깜빡
}

// ============================================
//  v1.3: DISARM 감시 — 자율 모드 중에만 호출
//  30초 동안 스틱 조작이 없으면 자동 해제
// ============================================
void checkDisarm() {
  if (millis() - lastAutoActivity >= AUTO_IDLE_TIMEOUT) {
    disarmAuto();
  }
}

// ============================================
//  관절별 안전 각도 클램프
// ============================================
int clampAngle(int pin, int angle) {
  switch (pin) {
    case PIN_BASE:    return constrain(angle, BASE_MIN,    BASE_MAX);
    case PIN_LOWER:   return constrain(angle, LOWER_MIN,   LOWER_MAX);
    case PIN_UPPER:   return constrain(angle, UPPER_MIN,   UPPER_MAX);
    case PIN_GRIPPER: return constrain(angle, GRIPPER_MIN, GRIPPER_MAX);
    default:          return constrain(angle, 0, 180);
  }
}

// ============================================
//  서보 이동 (실시간 모드용)
// ============================================
void moveServo(int pin, int angle) {
  angle = clampAngle(pin, angle);
  if (pin >= 0 && pin < 12 && lastAngle[pin] == angle) return;

  switch (pin) {
    case PIN_BASE:    servoBase.write(angle);    break;
    case PIN_LOWER:   servoLower.write(angle);   break;
    case PIN_UPPER:   servoUpper.write(angle);   break;
    case PIN_GRIPPER: servoGripper.write(angle); break;
    default: return;
  }
  if (pin >= 0 && pin < 12) lastAngle[pin] = angle;

  Serial.print("A,");
  Serial.print(pin); Serial.print(',');
  Serial.println(angle);
}

void syncCurAngle(int pin, int angle) {
  angle = clampAngle(pin, angle);
  switch (pin) {
    case PIN_BASE:    curBase = angle;    break;
    case PIN_LOWER:   curLower = angle;   break;
    case PIN_UPPER:   curUpper = angle;   break;
    case PIN_GRIPPER: curGripper = angle; break;
  }
}

// ============================================
//  조이스틱 중립값 측정
// ============================================
void calibrateJoystickCenter() {
  long s1x = 0, s1y = 0, s2x = 0, s2y = 0;
  const int N = 16;
  for (int i = 0; i < N; i++) {
    s1x += analogRead(PIN_JOY1_X);
    s1y += analogRead(PIN_JOY1_Y);
    s2x += analogRead(PIN_JOY2_X);
    s2y += analogRead(PIN_JOY2_Y);
    delay(2);
  }
  centerJ1x = s1x / N;  centerJ1y = s1y / N;
  centerJ2x = s2x / N;  centerJ2y = s2y / N;
}

// ============================================
//  v1.3: 자율 조이스틱 모드
//  매핑(실물 확인 필요):
//   왼쪽  Y → 베이스 6 / 왼쪽  X → 하완 9
//   오른쪽 Y → 그리퍼 11 / 오른쪽 X → 상완 10
//  ※ 방향 반대면 해당 줄 +1/-1 부호 교체
// ============================================
void runAutoJoystick() {
  unsigned long now = millis();
  if (now - tAutoMove < AUTO_STEP_PERIOD) return;
  tAutoMove = now;

  int x1 = analogRead(PIN_JOY1_X);
  int y1 = analogRead(PIN_JOY1_Y);
  int x2 = analogRead(PIN_JOY2_X);
  int y2 = analogRead(PIN_JOY2_Y);

  // v1.3.1: 모든 스틱이 중립 근처로 돌아올 때까지 제어 보류 (진입 자세 → 강제 이동 방지)
  if (!autoReady) {
    bool allCentered =
        (abs(x1 - centerJ1x) < JOY_THRESHOLD) && (abs(y1 - centerJ1y) < JOY_THRESHOLD) &&
        (abs(x2 - centerJ2x) < JOY_THRESHOLD) && (abs(y2 - centerJ2y) < JOY_THRESHOLD);
    if (allCentered) {
      autoReady = true;            // 이제부터 조이스틱 제어 시작
    }
    // 아직 중립 복귀 전 → 90도 유지, 아무 동작 안 함
    servoBase.write(curBase);
    servoLower.write(curLower);
    servoUpper.write(curUpper);
    servoGripper.write(curGripper);
    return;
  }

  bool moved = false;

  // 왼쪽 Y → 베이스(6)
  if (y1 < centerJ1y - JOY_THRESHOLD)      { curBase = constrain(curBase - 1, BASE_MIN, BASE_MAX); moved = true; }
  else if (y1 > centerJ1y + JOY_THRESHOLD) { curBase = constrain(curBase + 1, BASE_MIN, BASE_MAX); moved = true; }

  // 왼쪽 X → 하완(9)
  if (x1 < centerJ1x - JOY_THRESHOLD)      { curLower = constrain(curLower + 1, LOWER_MIN, LOWER_MAX); moved = true; }
  else if (x1 > centerJ1x + JOY_THRESHOLD) { curLower = constrain(curLower - 1, LOWER_MIN, LOWER_MAX); moved = true; }

  // 오른쪽 Y → 그리퍼(11)
  if (y2 < centerJ2y - JOY_THRESHOLD)      { curGripper = constrain(curGripper + 1, GRIPPER_MIN, GRIPPER_MAX); moved = true; }
  else if (y2 > centerJ2y + JOY_THRESHOLD) { curGripper = constrain(curGripper - 1, GRIPPER_MIN, GRIPPER_MAX); moved = true; }

  // 오른쪽 X → 상완(10)
  if (x2 < centerJ2x - JOY_THRESHOLD)      { curUpper = constrain(curUpper - 1, UPPER_MIN, UPPER_MAX); moved = true; }
  else if (x2 > centerJ2x + JOY_THRESHOLD) { curUpper = constrain(curUpper + 1, UPPER_MIN, UPPER_MAX); moved = true; }

  if (moved) lastAutoActivity = now;   // 조작 감지 → 무동작 타이머 리셋

  servoBase.write(curBase);
  servoLower.write(curLower);
  servoUpper.write(curUpper);
  servoGripper.write(curGripper);

  // 자율 모드 표시: LED 느린 깜빡임 (알림 중이 아닐 때)
  if (ledNotifyCount == 0) {
    digitalWrite(PIN_LED, (now / 500) % 2 ? HIGH : LOW);
  }
}

// ============================================
//  LED 알림 (시동/해제 시 깜빡임) — 비차단
// ============================================
void ledNotify(int count) {
  ledNotifyCount = count * 2;   // ON/OFF 1쌍 = 2
  tLedNotify = millis();
}
void serviceLedNotify() {
  if (ledNotifyCount <= 0) return;
  unsigned long now = millis();
  if (now - tLedNotify >= 80) {
    tLedNotify = now;
    ledNotifyCount--;
    digitalWrite(PIN_LED, ledNotifyCount % 2 ? HIGH : LOW);
  }
}

// ============================================
//  초음파 송신 (실시간 모드)
// ============================================
void sendUltrasonicIfDue() {
  unsigned long now = millis();
  if (now - tUltrasonic < PERIOD_US) return;
  tUltrasonic = now;

  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  long duration = pulseIn(PIN_ECHO, HIGH, 25000UL);
  int distance;
  if (duration <= 0) {
    distance = 999;
  } else {
    distance = (int)(duration / 58.82);
    if (distance < 1 || distance > 400) distance = 999;
  }
  Serial.print("U,");
  Serial.println(distance);
}

// ============================================
//  조이스틱 송신 (실시간 모드 - 시뮬 시각화용)
// ============================================
void sendJoysticksIfDue() {
  unsigned long now = millis();
  if (now - tJoystick < PERIOD_JOY) return;
  tJoystick = now;

  int x1 = analogRead(PIN_JOY1_X);
  int y1 = analogRead(PIN_JOY1_Y);
  int s1 = digitalRead(PIN_JOY1_SW);
  int x2 = analogRead(PIN_JOY2_X);
  int y2 = analogRead(PIN_JOY2_Y);
  int s2 = digitalRead(PIN_JOY2_SW);

  if (changedEnough(x1, lastJ1x) || changedEnough(y1, lastJ1y) || s1 != lastJ1sw) {
    Serial.print("J1,");
    Serial.print(x1); Serial.print(',');
    Serial.print(y1); Serial.print(',');
    Serial.println(s1);
    lastJ1x = x1; lastJ1y = y1; lastJ1sw = s1;
  }
  if (changedEnough(x2, lastJ2x) || changedEnough(y2, lastJ2y) || s2 != lastJ2sw) {
    Serial.print("J2,");
    Serial.print(x2); Serial.print(',');
    Serial.print(y2); Serial.print(',');
    Serial.println(s2);
    lastJ2x = x2; lastJ2y = y2; lastJ2sw = s2;
  }
}

bool changedEnough(int now, int before) {
  if (before == -999) return true;
  return abs(now - before) >= JOY_DEADZONE;
}

void sendReady() {
  Serial.println(F("READY,CUBELINK,v1.3.1"));
}
