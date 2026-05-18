/**
 * Web Serial API Polyfill for Capacitor Android (최종 완결판)
 * window.Capacitor.Plugins 구조를 직접 호출하여 네이티브 연결 오류를 완벽히 해결합니다.
 */
(function() {
  if ('serial' in navigator && navigator.serial) {
    console.log('[Serial] 데스크톱 환경 - 네이티브 navigator.serial 사용');
    return;
  }

  console.log('[Serial] 모바일 앱 환경 감지 - 내장 시리얼 플러그인 연결 가동');

  class CapSerialPort {
    constructor(deviceInfo) {
      this._info = deviceInfo;
      this._open = false;
      this._readBuffer = [];
      this._readResolvers = [];
      this._listenerHandle = null;
    }

    getInfo() {
      return { usbVendorId: this._info.vendorId, usbProductId: this._info.productId };
    }

    async open(options) {
      if (!window.Capacitor || !window.Capacitor.Plugins.UsbSerial) {
        throw new Error('네이티브 USB Serial 플러그인을 로드할 수 없습니다.');
      }
      const UsbSerial = window.Capacitor.Plugins.UsbSerial;
      const baudRate = options?.baudRate || 9600;

      const result = await UsbSerial.open({
        deviceId: this._info.deviceId,
        baudRate: baudRate,
        dataBits: options?.dataBits || 8,
        stopBits: options?.stopBits || 1,
        parity: options?.parity || 'none'
      });
      if (!result.success) throw new Error(result.error || 'USB 포트 개방 실패');
      this._open = true;

      this._listenerHandle = await UsbSerial.addListener('dataReceived', (event) => {
        const bytes = Uint8Array.from(atob(event.data), c => c.charCodeAt(0));
        if (this._readResolvers.length > 0) {
          const resolver = this._readResolvers.shift();
          resolver({ value: bytes, done: false });
        } else {
          this._readBuffer.push(bytes);
        }
      });
    }

    async close() {
      if (!window.Capacitor) return;
      const UsbSerial = window.Capacitor.Plugins.UsbSerial;
      if (this._listenerHandle) await this._listenerHandle.remove();
      await UsbSerial.close({ deviceId: this._info.deviceId });
      this._open = false;
      this._readResolvers.forEach(r => r({ value: undefined, done: true }));
      this._readResolvers = [];
    }

    get readable() {
      const self = this;
      return {
        getReader() {
          return {
            async read() {
              if (!self._open) return { value: undefined, done: true };
              if (self._readBuffer.length > 0) {
                return { value: self._readBuffer.shift(), done: false };
              }
              return new Promise(resolve => self._readResolvers.push(resolve));
            },
            releaseLock() {},
            cancel() {
              self._readResolvers.forEach(r => r({ value: undefined, done: true }));
              self._readResolvers = [];
              return Promise.resolve();
            }
          };
        }
      };
    }

    get writable() {
      const self = this;
      return {
        getWriter() {
          return {
            async write(data) {
              if (!window.Capacitor) return;
              const UsbSerial = window.Capacitor.Plugins.UsbSerial;
              const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
              let binary = '';
              for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
              const b64 = btoa(binary);
              await UsbSerial.write({ deviceId: self._info.deviceId, data: b64 });
            },
            releaseLock() {},
            close() { return Promise.resolve(); }
          };
        }
      };
    }
  }

  const serialPolyfill = {
    async requestPort(options) {
      if (!window.Capacitor || !window.Capacitor.Plugins.UsbSerial) {
        throw new DOMException('하드웨어 플러그인이 감지되지 않았습니다.', 'NotFoundError');
      }
      const UsbSerial = window.Capacitor.Plugins.UsbSerial;
      const result = await UsbSerial.listDevices();
      const devices = result.devices || [];
      if (devices.length === 0) {
        throw new DOMException('USB 시리얼 장치를 찾을 수 없습니다. OTG 연결을 확인하세요.', 'NotFoundError');
      }
      const chosen = devices[0];
      const perm = await UsbSerial.requestPermission({ deviceId: chosen.deviceId });
      if (!perm.granted) {
        throw new DOMException('USB OTG 권한이 거부되었습니다.', 'SecurityError');
      }
      return new CapSerialPort(chosen);
    },

    async getPorts() {
      if (!window.Capacitor || !window.Capacitor.Plugins.UsbSerial) return [];
      const UsbSerial = window.Capacitor.Plugins.UsbSerial;
      const result = await UsbSerial.listDevices();
      return (result.devices || []).map(d => new CapSerialPort(d));
    },

    addEventListener() {},
    removeEventListener() {}
  };

  Object.defineProperty(navigator, 'serial', {
    value: serialPolyfill,
    writable: false,
    configurable: false
  });

  console.log('[Serial] 안드로이드 전용 시리얼 다이렉트 통신망 구축 완료');
})();