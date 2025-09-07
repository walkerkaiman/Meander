/**
 * Manages device identification and capabilities
 */
export class DeviceManager {
  private static instance: DeviceManager;
  private deviceId: string;

  private constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }

  static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }
    return DeviceManager.instance;
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  private getOrCreateDeviceId(): string {
    const storedId = localStorage.getItem('meander_device_id');
    if (storedId) {
      return storedId;
    }

    const newId = crypto.randomUUID();
    localStorage.setItem('meander_device_id', newId);
    return newId;
  }

  /**
   * Triggers device vibration if supported
   */
  vibrate(pattern: number | number[] = 100): boolean {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
        return true;
      } catch (error) {
        console.warn('Vibration failed:', error);
      }
    }
    return false;
  }

  /**
   * Checks if the device supports vibration
   */
  supportsVibration(): boolean {
    return 'vibrate' in navigator;
  }

  /**
   * Gets basic device information
   */
  getDeviceInfo(): {
    userAgent: string;
    platform: string;
    isMobile: boolean;
    isPortrait: boolean;
    screenWidth: number;
    screenHeight: number;
  } {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isPortrait: window.innerHeight > window.innerWidth,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight
    };
  }
}

