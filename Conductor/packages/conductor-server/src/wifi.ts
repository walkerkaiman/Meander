import { execSync } from 'child_process';
import { platform } from 'os';

// Wi-Fi QR code format: WIFI:T:WPA;S:<SSID>;P:<PASSWORD>;;

export interface WiFiNetwork {
  ssid: string;
  password: string;
  security: 'WPA' | 'WEP' | 'nopass';
}

/**
 * Generate Wi-Fi QR code string in the standard format
 */
export function generateWiFiQRString(network: WiFiNetwork): string {
  return `WIFI:T:${network.security};S:${network.ssid};P:${network.password};;`;
}

/**
 * Attempt to get the current Wi-Fi network SSID
 * Note: This is platform-dependent and may require elevated privileges
 */
export function getCurrentWiFiNetwork(): string | null {
  try {
    switch (platform()) {
      case 'win32':
        // Windows: Use netsh command
        const output = execSync('netsh wlan show interfaces', { encoding: 'utf8' });
        const ssidMatch = output.match(/SSID\s*:\s*(.+)/i);
        return ssidMatch ? ssidMatch[1].trim() : null;

      case 'darwin':
        // macOS: Use airport command
        const airportOutput = execSync('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I', { encoding: 'utf8' });
        const macSsidMatch = airportOutput.match(/SSID:\s*(.+)/i);
        return macSsidMatch ? macSsidMatch[1].trim() : null;

      case 'linux':
        // Linux: Use iwconfig or nmcli
        try {
          const iwconfigOutput = execSync('iwconfig 2>/dev/null | grep ESSID', { encoding: 'utf8' });
          const linuxSsidMatch = iwconfigOutput.match(/ESSID:"([^"]+)"/);
          if (linuxSsidMatch) return linuxSsidMatch[1];
        } catch {
          // Fallback to nmcli
          try {
            const nmcliOutput = execSync('nmcli -t -f active,ssid dev wifi | grep "^yes:"', { encoding: 'utf8' });
            const nmcliMatch = nmcliOutput.match(/^yes:(.+)/);
            return nmcliMatch ? nmcliMatch[1].trim() : null;
          } catch {
            return null;
          }
        }
        return null;

      default:
        return null;
    }
  } catch (error) {
    console.warn('Failed to detect current Wi-Fi network:', error);
    return null;
  }
}

/**
 * Create a WiFiNetwork object with configured network name and password
 */
export function createWiFiNetworkConfig(networkName: string, password: string): WiFiNetwork {
  return {
    ssid: networkName,
    password,
    security: 'WPA', // Assume WPA as it's most common
  };
}

/**
 * Create a WiFiNetwork object for the current network with configured password
 * @deprecated Use createWiFiNetworkConfig instead for better control
 */
export function createCurrentNetworkConfig(password: string): WiFiNetwork {
  const ssid = getCurrentWiFiNetwork() || 'UnknownNetwork';

  return {
    ssid,
    password,
    security: 'WPA', // Assume WPA as it's most common
  };
}
