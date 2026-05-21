'use strict';

// ============================================
// 1. Blockly 블록 모양 및 속성 정의 (JSON 형식)
// ============================================
Blockly.defineBlocksWithJsonArray([
  // 🔧 기본 구조 블록
  {"type":"arduino_setup_loop","message0":"처음 한 번 setup() %1 %2 계속 반복 loop() %3 %4","args0":[{"type":"input_dummy"},{"type":"input_statement","name":"SETUP"},{"type":"input_dummy"},{"type":"input_statement","name":"LOOP"}],"colour":"#D4AF37"},
  {"type":"cubelink_delay","message0":"%1 ms 기다리기","args0":[{"type":"field_number","name":"MS","value":500}],"previousStatement":null,"nextStatement":null,"colour":"#D4AF37"},
  {"type":"cubelink_delay_sec","message0":"%1 초 기다리기","args0":[{"type":"field_number","name":"SEC","value":1}],"previousStatement":null,"nextStatement":null,"colour":"#D4AF37"},
  {"type":"cubelink_delay_us","message0":"%1 마이크로초 기다리기","args0":[{"type":"field_number","name":"US","value":100}],"previousStatement":null,"nextStatement":null,"colour":"#D4AF37"},

  // 🔁 흐름 제어 블록
  {"type":"controls_ifelse","message0":"만약 %1 이라면 %2 %3 아니면 %4 %5","args0":[{"type":"input_value","name":"IF0","check":"Boolean"},{"type":"input_dummy"},{"type":"input_statement","name":"DO0"},{"type":"input_dummy"},{"type":"input_statement","name":"ELSE"}],"previousStatement":null,"nextStatement":null,"colour":"#5C81A6"},
  {"type":"cubelink_repeat_n","message0":"%1 번 반복하기 %2 %3","args0":[{"type":"field_number","name":"TIMES","value":10},{"type":"input_dummy"},{"type":"input_statement","name":"DO"}],"previousStatement":null,"nextStatement":null,"colour":"#5C81A6"},
  {"type":"math_arithmetic","message0":"%1 %2 %3","args0":[{"type":"input_value","name":"A","check":"Number"},{"type":"field_dropdown","name":"OP","options":[["+","ADD"],["-","MINUS"],["×","MULTIPLY"],["÷","DIVIDE"]]},{"type":"input_value","name":"B","check":"Number"}],"inputsInline":true,"output":"Number","colour":"#5C81A6"},

  // 📡 시리얼 통신 블록
  {"type":"cubelink_serial_begin","message0":"시리얼 통신 시작 (%1 bps)","args0":[{"type":"field_dropdown","name":"BAUD","options":[["9600","9600"],["115200","115200"],["38400","38400"]]}],"previousStatement":null,"nextStatement":null,"colour":"#27AE60"},
  {"type":"cubelink_serial_println_text","message0":"시리얼에 \"%1\" 출력 (새 줄)","args0":[{"type":"field_input","name":"TEXT","text":"Hello"}],"previousStatement":null,"nextStatement":null,"colour":"#27AE60"},
  {"type":"cubelink_serial_println_num","message0":"시리얼에 숫자 %1 출력 (새 줄)","args0":[{"type":"field_number","name":"NUM","value":0}],"previousStatement":null,"nextStatement":null,"colour":"#27AE60"},
  {"type":"cubelink_serial_println_value","message0":"시리얼에 값 %1 출력 (센서/변수)","args0":[{"type":"input_value","name":"VAL"}],"previousStatement":null,"nextStatement":null,"colour":"#27AE60"},

  // 💡 LED·디지털 제어 블록
  {"type":"cubelink_pinmode","message0":"핀 %1 을 %2 으로 설정","args0":[{"type":"field_dropdown","name":"PIN","options":[["2","2"],["3","3"],["4","4"],["5","5"],["6","6"],["7","7"],["8","8"],["9","9"],["10","10"],["11","11"],["12","12"],["13","13"]]},{"type":"field_dropdown","name":"MODE","options":[["출력","OUTPUT"],["입력","INPUT"],["내장 풀업 입력","INPUT_PULLUP"]]}],"previousStatement":null,"nextStatement":null,"colour":"#E74C3C"},
  {"type":"cubelink_digitalwrite","message0":"디지털 핀 %1 에 %2","args0":[{"type":"field_dropdown","name":"PIN","options":[["2","2"],["3","3"],["4","4"],["5","5"],["6","6"],["7","7"],["8","8"],["9","9"],["10","10"],["11","11"],["12","12"],["13","13"]]},{"type":"field_dropdown","name":"VAL","options":[["켜기 HIGH","HIGH"],["끄기 LOW","LOW"]]}],"previousStatement":null,"nextStatement":null,"colour":"#E74C3C"},
  {"type":"cubelink_digitalread","message0":"디지털 핀 %1 읽기","args0":[{"type":"field_dropdown","name":"PIN","options":[["2","2"],["3","3"],["4","4"],["5","5"],["6","6"],["7","7"],["8","8"],["9","9"],["10","10"],["11","11"],["12","12"],["13","13"]]}],"output":"Number","colour":"#E74C3C"},

  // 📡 센서·아날로그 블록
  {"type":"cubelink_analogread","message0":"아날로그 핀 %1 읽기","args0":[{"type":"field_dropdown","name":"PIN","options":[["A0","A0"],["A1","A1"],["A2","A2"],["A3","A3"],["A4","A4"],["A5","A5"]]}],"output":"Number","colour":"#F39C12"},
  {"type":"cubelink_ultrasonic","message0":"초음파 거리(cm) Trig %1 Echo %2","args0":[{"type":"field_number","name":"TRIG","value":7},{"type":"field_number","name":"ECHO","value":6}],"output":"Number","colour":"#F39C12"},
  {"type":"cubelink_map_simple","message0":"숫자 %1 을 (%2 ~ %3) → (%4 ~ %5) 로 변환","args0":[{"type":"field_number","name":"VAL","value":512},{"type":"field_number","name":"FL","value":0},{"type":"field_number","name":"FH","value":1023},{"type":"field_number","name":"TL","value":0},{"type":"field_number","name":"TH","value":180}],"output":"Number","colour":"#F39C12"},
  {"type":"cubelink_map","message0":"값 %1 을 (%2 ~ %3) → (%4 ~ %5) 로 변환","args0":[{"type":"input_value","name":"VAL"},{"type":"field_number","name":"FL","value":0},{"type":"field_number","name":"FH","value":1023},{"type":"field_number","name":"TL","value":0},{"type":"field_number","name":"TH","value":180}],"output":"Number","colour":"#F39C12"},

  // 🤖 서보 모터 블록 (기존)
  {"type":"cubelink_servo_attach","message0":"서보 핀 %1 연결","args0":[{"type":"field_dropdown","name":"PIN","options":[["6","6"],["9","9"],["10","10"],["11","11"]]}],"previousStatement":null,"nextStatement":null,"colour":"#3498DB"},
  {"type":"cubelink_servo_move_simple","message0":"서보 핀 %1 을 %2 도로 회전","args0":[{"type":"field_dropdown","name":"PIN","options":[["6","6"],["9","9"],["10","10"],["11","11"]]},{"type":"field_number","name":"ANGLE","value":90}],"previousStatement":null,"nextStatement":null,"colour":"#3498DB"},
  {"type":"cubelink_servo_move","message0":"서보 핀 %1 을 [값] %2 도로 회전","args0":[{"type":"field_dropdown","name":"PIN","options":[["6","6"],["9","9"],["10","10"],["11","11"]]},{"type":"input_value","name":"ANGLE","check":"Number"}],"previousStatement":null,"nextStatement":null,"colour":"#3498DB"},
  {"type":"cubelink_servo_smooth_simple","message0":"서보 핀 %1 을 %2 도로 %3 초 동안 부드럽게","args0":[{"type":"field_dropdown","name":"PIN","options":[["6","6"],["9","9"],["10","10"],["11","11"]]},{"type":"field_number","name":"ANGLE","value":90},{"type":"field_number","name":"SEC","value":1}],"previousStatement":null,"nextStatement":null,"colour":"#3498DB"},
  {"type":"cubelink_servo_smooth","message0":"서보 핀 %1 을 [값] %2 도로 %3 초 동안 부드럽게","args0":[{"type":"field_dropdown","name":"PIN","options":[["6","6"],["9","9"],["10","10"],["11","11"]]},{"type":"input_value","name":"ANGLE","check":"Number"},{"type":"field_number","name":"SEC","value":1}],"previousStatement":null,"nextStatement":null,"colour":"#3498DB"},
  {"type":"cubelink_servo_read","message0":"서보 핀 %1 현재 각도","args0":[{"type":"field_dropdown","name":"PIN","options":[["6","6"],["9","9"],["10","10"],["11","11"]]}],"output":"Number","colour":"#3498DB"},

  // 🕹️ 조이스틱 블록
  {"type":"cubelink_joystick_init","message0":"조이스틱 시작: 방향 %1 VRx %2 VRy %3 SW %4","args0":[{"type":"field_dropdown","name":"NAME","options":[["왼쪽","왼쪽"],["오른쪽","오른쪽"]]},{"type":"field_dropdown","name":"VRX","options":[["A0","A0"],["A1","A1"],["A2","A2"],["A3","A3"]]},{"type":"field_dropdown","name":"VRY","options":[["A1","A1"],["A0","A0"],["A2","A2"],["A3","A3"]]},{"type":"field_dropdown","name":"SW","options":[["2","2"],["7","7"],["3","3"],["4","4"],["5","5"],["8","8"]]}],"previousStatement":null,"nextStatement":null,"colour":"#9B59B6"},
  {"type":"cubelink_joystick_read","message0":"%1 조이스틱의 %2","args0":[{"type":"field_dropdown","name":"NAME","options":[["왼쪽","왼쪽"],["오른쪽","오른쪽"]]},{"type":"field_dropdown","name":"PROP","options":[["X축 값","X"],["Y축 값","Y"],["버튼 눌림?","BTN"]]}],"output":null,"colour":"#9B59B6"},

  // ====== v2.6.4 BLOCKOLI 스타일 신규 블록 ======
  {"type":"cubelink_v2_serial_begin","message0":"시리얼 통신 준비: 통신 속도 %1 bps","args0":[{"type":"field_number","name":"BAUD","value":9600,"min":300,"max":250000}],"previousStatement":null,"nextStatement":null,"colour":"#7B5CFF"},
  {"type":"cubelink_v2_joystick_init","message0":"조이스틱 시작하기: 방향 %1 VRx핀 %2 VRy핀 %3 SW핀 %4","args0":[{"type":"field_dropdown","name":"JNAME","options":[["왼쪽","왼쪽"],["오른쪽","오른쪽"]]},{"type":"field_dropdown","name":"VRX","options":[["A0","A0"],["A1","A1"],["A2","A2"],["A3","A3"],["A4","A4"],["A5","A5"],["A6","A6"],["A7","A7"]]},{"type":"field_dropdown","name":"VRY","options":[["A0","A0"],["A1","A1"],["A2","A2"],["A3","A3"],["A4","A4"],["A5","A5"],["A6","A6"],["A7","A7"]]},{"type":"field_dropdown","name":"SW","options":[["2","2"],["3","3"],["4","4"],["5","5"],["6","6"],["7","7"],["8","8"],["9","9"],["10","10"],["11","11"],["12","12"],["13","13"]]}],"previousStatement":null,"nextStatement":null,"colour":"#9B59B6"},
  {"type":"cubelink_v2_joystick_x","message0":"%1 조이스틱 X축 값","args0":[{"type":"field_dropdown","name":"JNAME","options":[["왼쪽","왼쪽"],["오른쪽","오른쪽"]]}],"output":"Number","colour":"#9B59B6"},
  {"type":"cubelink_v2_joystick_y","message0":"%1 조이스틱 Y축 값","args0":[{"type":"field_dropdown","name":"JNAME","options":[["왼쪽","왼쪽"],["오른쪽","오른쪽"]]}],"output":"Number","colour":"#9B59B6"},
  {"type":"cubelink_v2_joystick_btn","message0":"%1 조이스틱 버튼","args0":[{"type":"field_dropdown","name":"JNAME","options":[["왼쪽","왼쪽"],["오른쪽","오른쪽"]]}],"output":"Boolean","colour":"#9B59B6"},
  {"type":"cubelink_v2_servo_set","message0":"180° 서보 모터 핀 %1 각도 %2 도로 지정하기","args0":[{"type":"field_dropdown","name":"PIN","options":[["3","3"],["5","5"],["6","6"],["9","9"],["10","10"],["11","11"]]},{"type":"field_number","name":"ANGLE","value":90,"min":0,"max":180}],"previousStatement":null,"nextStatement":null,"colour":"#E67E22"},
  {"type":"cubelink_v2_servo_set_value","message0":"180° 서보 모터 핀 %1 각도 %2 도로 지정하기","args0":[{"type":"field_dropdown","name":"PIN","options":[["3","3"],["5","5"],["6","6"],["9","9"],["10","10"],["11","11"]]},{"type":"input_value","name":"ANGLE","check":"Number"}],"inputsInline":true,"previousStatement":null,"nextStatement":null,"colour":"#E67E22"},
  {"type":"cubelink_v2_servo_read","message0":"180° 서보 모터 핀 %1 각도","args0":[{"type":"field_dropdown","name":"PIN","options":[["3","3"],["5","5"],["6","6"],["9","9"],["10","10"],["11","11"]]}],"output":"Number","colour":"#E67E22"},
  {"type":"cubelink_v2_if","message0":"만약 %1 (이)라면 %2 실행 %3","args0":[{"type":"input_value","name":"COND","check":"Boolean"},{"type":"input_dummy"},{"type":"input_statement","name":"DO"}],"previousStatement":null,"nextStatement":null,"colour":"#27AE60"},
  {"type":"cubelink_v2_if_else","message0":"만약 %1 (이)라면 %2 실행 %3 아니면 %4","args0":[{"type":"input_value","name":"COND","check":"Boolean"},{"type":"input_dummy"},{"type":"input_statement","name":"DO"},{"type":"input_statement","name":"ELSE"}],"previousStatement":null,"nextStatement":null,"colour":"#27AE60"},
  {"type":"cubelink_v2_delay_ms","message0":"%1 밀리초 기다리기","args0":[{"type":"field_number","name":"MS","value":30,"min":0,"max":600000}],"previousStatement":null,"nextStatement":null,"colour":"#16A085"}
]);

// ============================================
// 2. 아두이노 C++ 코드 생성기 엔진 정의
// ============================================
const Arduino = new Blockly.Generator('Arduino');
Arduino.ORDER_ATOMIC = 0;
Arduino.ORDER_NONE = 99;
Arduino.scrub_ = (b, code) => code + (b.nextConnection && b.nextConnection.targetBlock() ? Arduino.blockToCode(b.nextConnection.targetBlock()) : '');

// 라이브러리 include 및 전역 변수 동적 주입용 박스
window.headerExtras = { includes: new Set(), globals: new Set(), helpers: new Set() };
window.resetHeaders = function() {
  window.headerExtras = { includes: new Set(), globals: new Set(), helpers: new Set() };
};

// ----- 기본 구조 & 제어 번역 로직 -----
Arduino.forBlock['cubelink_delay'] = b => `  delay(${b.getFieldValue('MS')});\n`;
Arduino.forBlock['cubelink_delay_sec'] = b => `  delay(${b.getFieldValue('SEC') * 1000});\n`;
Arduino.forBlock['cubelink_delay_us'] = b => `  delayMicroseconds(${b.getFieldValue('US')});\n`;
Arduino.forBlock['controls_if'] = b => `  if (${Arduino.valueToCode(b, 'IF0', 0) || 'false'}) {\n${Arduino.statementToCode(b, 'DO0')}  }\n`;
Arduino.forBlock['controls_ifelse'] = b => `  if (${Arduino.valueToCode(b, 'IF0', 0) || 'false'}) {\n${Arduino.statementToCode(b, 'DO0')}  } else {\n${Arduino.statementToCode(b, 'ELSE')}  }\n`;
Arduino.forBlock['cubelink_repeat_n'] = b => `  for (int i = 0; i < ${b.getFieldValue('TIMES')}; i++) {\n${Arduino.statementToCode(b, 'DO')}  }\n`;
Arduino.forBlock['logic_compare'] = b => {
  const op = {EQ:'==', NEQ:'!=', LT:'<', LTE:'<=', GT:'>', GTE:'>='}[b.getFieldValue('OP')];
  const a = Arduino.valueToCode(b, 'A', 0) || '0';
  const c = Arduino.valueToCode(b, 'B', 0) || '0';
  return [`(${a} ${op} ${c})`, 0];
};
Arduino.forBlock['math_number'] = b => [String(b.getFieldValue('NUM')), 0];
Arduino.forBlock['math_arithmetic'] = b => {
  const op = {ADD:'+', MINUS:'-', MULTIPLY:'*', DIVIDE:'/'}[b.getFieldValue('OP')];
  const a = Arduino.valueToCode(b, 'A', 0) || '0';
  const c = Arduino.valueToCode(b, 'B', 0) || '0';
  return [`(${a} ${op} ${c})`, 0];
};

// ----- 변수 번역 로직 -----
Arduino.forBlock['variables_get'] = b => [b.getField('VAR').getText(), 0];
Arduino.forBlock['variables_set'] = b => {
  const name = b.getField('VAR').getText();
  const val = Arduino.valueToCode(b, 'VALUE', 0) || '0';
  window.headerExtras.globals.add(`int ${name} = 0;`);
  return `  ${name} = ${val};\n`;
};
Arduino.forBlock['math_change'] = b => {
  const name = b.getField('VAR').getText();
  const val = Arduino.valueToCode(b, 'DELTA', 0) || '0';
  window.headerExtras.globals.add(`int ${name} = 0;`);
  return `  ${name} += ${val};\n`;
};

// ----- 통신 & 입출력 번역 로직 -----
Arduino.forBlock['cubelink_serial_begin'] = b => `  Serial.begin(${b.getFieldValue('BAUD')});\n`;
Arduino.forBlock['cubelink_serial_println_text'] = b => `  Serial.println("${b.getFieldValue('TEXT')}");\n`;
Arduino.forBlock['cubelink_serial_println_num'] = b => `  Serial.println(${b.getFieldValue('NUM')});\n`;
Arduino.forBlock['cubelink_serial_println_value'] = b => `  Serial.println(${Arduino.valueToCode(b, 'VAL', 0) || '0'});\n`;
Arduino.forBlock['cubelink_pinmode'] = b => `  pinMode(${b.getFieldValue('PIN')}, ${b.getFieldValue('MODE')});\n`;
Arduino.forBlock['cubelink_digitalwrite'] = b => `  digitalWrite(${b.getFieldValue('PIN')}, ${b.getFieldValue('VAL')});\n`;
Arduino.forBlock['cubelink_digitalread'] = b => [`digitalRead(${b.getFieldValue('PIN')})`, 0];
Arduino.forBlock['cubelink_analogread'] = b => [`analogRead(${b.getFieldValue('PIN')})`, 0];

Arduino.forBlock['cubelink_ultrasonic'] = b => {
  window.headerExtras.helpers.add(
`float readUltrasonic(int trig, int echo) {
  pinMode(trig, OUTPUT); pinMode(echo, INPUT);
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  return pulseIn(echo, HIGH) / 58.82;
}`);
  return [`readUltrasonic(${b.getFieldValue('TRIG')}, ${b.getFieldValue('ECHO')})`, 0];
};
Arduino.forBlock['cubelink_map_simple'] = b => [`map(${b.getFieldValue('VAL')}, ${b.getFieldValue('FL')}, ${b.getFieldValue('FH')}, ${b.getFieldValue('TL')}, ${b.getFieldValue('TH')})`, 0];
Arduino.forBlock['cubelink_map'] = b => {
  const val = Arduino.valueToCode(b, 'VAL', 0) || '0';
  return [`map(${val}, ${b.getFieldValue('FL')}, ${b.getFieldValue('FH')}, ${b.getFieldValue('TL')}, ${b.getFieldValue('TH')})`, 0];
};

// ----- 서보 모터 및 조이스틱 번역 헬퍼 함수들 -----
function ensureServo(pin){
  window.headerExtras.includes.add('#include <Servo.h>');
  window.headerExtras.globals.add(`Servo myServo${pin};`);
}
function smoothHelper(){
  window.headerExtras.helpers.add(
`void moveServoSmooth(Servo &sv, int target, float seconds) {
  int start = sv.read();
  int diff = abs(target - start);
  if(diff == 0) return;
  int stepDelay = (seconds * 1000) / diff;
  if(stepDelay < 10) stepDelay = 10;
  if(target > start) {
    for(int a = start; a <= target; a++) { sv.write(a); delay(stepDelay); }
  } else {
    for(int a = start; a >= target; a--) { sv.write(a); delay(stepDelay); }
  }
}`);
}

Arduino.forBlock['cubelink_servo_attach'] = b => { const pin = b.getFieldValue('PIN'); ensureServo(pin); return `  myServo${pin}.attach(${pin});\n`; };
Arduino.forBlock['cubelink_servo_move_simple'] = b => { const pin = b.getFieldValue('PIN'); ensureServo(pin); return `  myServo${pin}.write(${b.getFieldValue('ANGLE')});\n`; };
Arduino.forBlock['cubelink_servo_move'] = b => { const pin = b.getFieldValue('PIN'); ensureServo(pin); const angle = Arduino.valueToCode(b, 'ANGLE', 0) || '90'; return `  myServo${pin}.write(${angle});\n`; };
Arduino.forBlock['cubelink_servo_smooth_simple'] = b => { const pin = b.getFieldValue('PIN'); ensureServo(pin); smoothHelper(); return `  moveServoSmooth(myServo${pin}, ${b.getFieldValue('ANGLE')}, ${b.getFieldValue('SEC')});\n`; };
Arduino.forBlock['cubelink_servo_smooth'] = b => { const pin = b.getFieldValue('PIN'); ensureServo(pin); smoothHelper(); const angle = Arduino.valueToCode(b, 'ANGLE', 0) || '90'; const sec = b.getFieldValue('SEC') || 1; return `  moveServoSmooth(myServo${pin}, ${angle}, ${sec});\n`; };
Arduino.forBlock['cubelink_servo_read'] = b => { const pin = b.getFieldValue('PIN'); ensureServo(pin); return [`myServo${pin}.read()`, 0]; };

function joyVarName(kor){ return (kor === '오른쪽') ? 'joyRight' : 'joyLeft'; }
Arduino.forBlock['cubelink_joystick_init'] = b => {
  const name = joyVarName(b.getFieldValue('NAME'));
  const vrx = b.getFieldValue('VRX'); const vry = b.getFieldValue('VRY'); const sw = b.getFieldValue('SW');
  window.headerExtras.globals.add(`struct Joystick { int xPin, yPin, swPin; };`);
  window.headerExtras.globals.add(`Joystick ${name};`);
  return `  ${name}.xPin = ${vrx}; ${name}.yPin = ${vry}; ${name}.swPin = ${sw};\n  pinMode(${sw}, INPUT_PULLUP);\n`;
};
Arduino.forBlock['cubelink_joystick_read'] = b => {
  const name = joyVarName(b.getFieldValue('NAME')); const prop = b.getFieldValue('PROP');
  if(prop === 'X') return [`analogRead(${name}.xPin)`, 0];
  if(prop === 'Y') return [`analogRead(${name}.yPin)`, 0];
  return [`(digitalRead(${name}.swPin) == LOW)`, 0];
};

// ----- v2.6.4 BLOCKOLI 전용 번역 내부 맵 구조 -----
let v2JoyMap = {}; let v2JoySeq = 0; let v2ServoInitDone = {};
window.v2ResetMaps = function(){ v2JoyMap = {}; v2JoySeq = 0; v2ServoInitDone = {}; };
function v2GetJoyId(rawName){
  const name = String(rawName || '').trim() || 'default';
  if(!v2JoyMap[name]){ v2JoySeq++; v2JoyMap[name] = 'joy_' + v2JoySeq; }
  return v2JoyMap[name];
}

Arduino.forBlock['cubelink_v2_serial_begin'] = b => `  Serial.begin(${b.getFieldValue('BAUD')});\n`;
Arduino.forBlock['cubelink_v2_joystick_init'] = b => {
  const id = v2GetJoyId(b.getFieldValue('JNAME'));
  const vrx = b.getFieldValue('VRX'); const vry = b.getFieldValue('VRY'); const sw = b.getFieldValue('SW');
  window.headerExtras.globals.add('struct JoystickV2 { int vrx, vry, sw; };');
  window.headerExtras.globals.add(`JoystickV2 ${id};`);
  return `  ${id}.vrx = ${vrx}; ${id}.vry = ${vry}; ${id}.sw = ${sw};\n  pinMode(${id}.sw, INPUT_PULLUP);\n`;
};
Arduino.forBlock['cubelink_v2_joystick_x'] = b => [`analogRead(${v2GetJoyId(b.getFieldValue('JNAME'))}.vrx)`, 0];
Arduino.forBlock['cubelink_v2_joystick_y'] = b => [`analogRead(${v2GetJoyId(b.getFieldValue('JNAME'))}.vry)`, 0];
Arduino.forBlock['cubelink_v2_joystick_btn'] = b => [`(digitalRead(${v2GetJoyId(b.getFieldValue('JNAME'))}.sw) == LOW)`, 0];

Arduino.forBlock['cubelink_v2_servo_set'] = b => {
  const pin = b.getFieldValue('PIN'); const angle = b.getFieldValue('ANGLE'); ensureServo(pin);
  if(!v2ServoInitDone[pin]){
    v2ServoInitDone[pin] = true;
    return `  if(!myServo${pin}.attached()) myServo${pin}.attach(${pin});\n  myServo${pin}.write(${angle});\n`;
  }
  return `  myServo${pin}.write(${angle});\n`;
};
Arduino.forBlock['cubelink_v2_servo_set_value'] = b => {
  const pin = b.getFieldValue('PIN'); const angle = Arduino.valueToCode(b, 'ANGLE', 0) || '90'; ensureServo(pin);
  if(!v2ServoInitDone[pin]){
    v2ServoInitDone[pin] = true;
    return `  if(!myServo${pin}.attached()) myServo${pin}.attach(${pin});\n  myServo${pin}.write(${angle});\n`;
  }
  return `  myServo${pin}.write(${angle});\n`;
};
Arduino.forBlock['cubelink_v2_servo_read'] = b => { const pin = b.getFieldValue('PIN'); ensureServo(pin); return [`myServo${pin}.read()`, 0]; };
Arduino.forBlock['cubelink_v2_if'] = b => `  if (${Arduino.valueToCode(b, 'COND', 0) || 'false'}) {\n${Arduino.statementToCode(b, 'DO')}  }\n`;
Arduino.forBlock['cubelink_v2_if_else'] = b => `  if (${Arduino.valueToCode(b, 'COND', 0) || 'false'}) {\n${Arduino.statementToCode(b, 'DO')}  } else {\n${Arduino.statementToCode(b, 'ELSE')}  }\n`;
Arduino.forBlock['cubelink_v2_delay_ms'] = b => `  delay(${b.getFieldValue('MS')});\n`;

// 전역 바인딩 처리
window.Arduino = Arduino;