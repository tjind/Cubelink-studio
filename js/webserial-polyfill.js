/**
 * CUBELINK Studio - PC Desktop 환경 보호 및 모바일 폴리필 격리 코드
 */
(function() {
  // 🚨 [철저한 PC 보호] PC 크롬 브라우저 환경이면 폴리필을 완전히 무력화하고 즉시 종료합니다.
  if (typeof window === 'undefined' || !window.Capacitor) {
    console.log('[CUBELINK] 데스크톱 PC 환경 감지 - 오리지널 네이티브 Web Serial 및 3D 엔진을 가동합니다.');
    return;
  }

  // 아래는 모바일 앱(Capacitor) 환경일 때만 격리되어 실행되는 코드입니다.
  const getUsbSerial = () => window.Capacitor?.Plugins?.UsbSerial || window.Capacitor?.compiledPlugins?.UsbSerial;

  class CapSerialPort {
    constructor(deviceInfo) { this._info = deviceInfo; this._open = false; this._readBuffer = []; this._readResolvers = []; this._listenerHandle = null; }
    getInfo() { return { usbVendorId: this._info.vendorId, usbProductId: this._info.productId }; }
    async open(options) {
      const UsbSerial = getUsbSerial();
      if (!UsbSerial) throw new Error('플러그인 로드 실패');
      const result = await UsbSerial.open({ deviceId: this._info.deviceId, baudRate: options?.baudRate || 9600, dataBits: 8, stopBits: 1, parity: 'none' });
      if (!result.success) throw new Error(result.error || '포트 개방 실패');
      this._open = true;
      this._listenerHandle = await UsbSerial.addListener('dataReceived', (event) => {
        const bytes = Uint8Array.from(atob(event.data), c => c.charCodeAt(0));
        if (this._readResolvers.length > 0) this._readResolvers.shift()({ value: bytes, done: false });
        else this._readBuffer.push(bytes);
      });
    }
    async close() {
      const UsbSerial = getUsbSerial();
      if (this._listenerHandle) await this._listenerHandle.remove();
      if (UsbSerial) await UsbSerial.close({ deviceId: this._info.deviceId });
      this._open = false;
    }
    get readable() {
      const self = this;
      return { getReader() { return {
            async read() {
              if (!self._open) return { value: undefined, done: true };
              if (self._readBuffer.length > 0) return { value: self._readBuffer.shift(), done: false };
              return new Promise(resolve => self._readResolvers.push(resolve));
            },
            releaseLock() {}, cancel() { return Promise.resolve(); }
      }; } };
    }
    get writable() {
      const self = this;
      return { getWriter() { return {
            async write(data) {
              const UsbSerial = getUsbSerial(); if (!UsbSerial) return;
              const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
              let binary = ''; for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
              await UsbSerial.write({ deviceId: self._info.deviceId, data: btoa(binary) });
            },
            releaseLock() {}, close() { return Promise.resolve(); }
      }; } };
    }
  }

  const serialPolyfill = {
    async requestPort() {
      const UsbSerial = getUsbSerial(); if (!UsbSerial) throw new DOMException('플러그인 로드 실패', 'NotFoundError');
      const result = await UsbSerial.listDevices(); const devices = result.devices || [];
      if (devices.length === 0) throw new DOMException('장치를 찾을 수 없습니다.', 'NotFoundError');
      const chosen = devices[0]; const perm = await UsbSerial.requestPermission({ deviceId: chosen.deviceId });
      if (!perm.granted) throw new DOMException('권한 거부', 'SecurityError');
      return new CapSerialPort(chosen);
    },
    async getPorts() {
      const UsbSerial = getUsbSerial(); if (!UsbSerial) return [];
      const result = await UsbSerial.listDevices(); return (result.devices || []).map(d => new CapSerialPort(d));
    },
    addEventListener() {}, removeEventListener() {}
  };
  Object.defineProperty(navigator, 'serial', { value: serialPolyfill, writable: false });
})();