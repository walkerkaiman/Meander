import dgram from "dgram";

const DEFAULT_PORT = Number(process.env.OSC_PORT ?? 57121);
const DEFAULT_HOST = process.env.OSC_HOST ?? '192.168.1.100'; // IP address of OSC receiver (unicast) or multicast group
const DEFAULT_MULTICAST = process.env.OSC_MULTICAST === 'true';

export class OscPublisher {
  private udpSocket: dgram.Socket;
  private port: number;
  private host: string;
  private isReady: boolean = false;
  private useMulticast: boolean;

  constructor(port: number = DEFAULT_PORT, host: string = DEFAULT_HOST, useMulticast: boolean = DEFAULT_MULTICAST) {
    this.port = port;
    this.host = host;
    this.useMulticast = useMulticast || host.startsWith('239.'); // Auto-detect multicast addresses
    
    // Create native UDP socket for direct OSC sending
    this.udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    
    this.udpSocket.on('error', (err) => {
      console.error('❌ UDP Socket error:', err);
      console.error('❌ This may prevent OSC messages from being sent!');
    });
    
    // Bind the socket
    this.udpSocket.bind(0, () => {
      // 0 = bind to random available port (ephemeral port)
      try {
        const socketAddr = this.udpSocket.address();
        console.log('✅ UDP socket bound to port:', socketAddr.port);
        
        if (this.useMulticast) {
          // Set multicast TTL (time to live) - how many network hops
          this.udpSocket.setMulticastTTL(128);
          // Enable multicast loopback (receive own messages for testing)
          this.udpSocket.setMulticastLoopback(true);
          console.log('✅ UDP multicast configured');
          console.log(`✅ Multicast group: ${host}:${port}`);
          console.log(`   📡 Listeners should join multicast group: ${host}`);
        } else {
          // For unicast: only enable broadcast if the host ends in .255 (broadcast address)
          // For specific IP addresses, we don't need broadcast enabled
          if (host.endsWith('.255')) {
            this.udpSocket.setBroadcast(true);
            console.log('✅ UDP broadcast enabled (subnet broadcast)');
          } else {
            console.log('✅ UDP unicast mode (sending to specific IP)');
          }
        }
        
        console.log(`✅ Will send OSC to: ${host}:${port}`);
        this.isReady = true;
        console.log('✅ OSC Publisher is READY to send messages');
      } catch (err) {
        console.error('❌ Failed to configure socket:', err);
        this.isReady = false;
      }
    });
    
    if (this.useMulticast) {
      console.log(`📡 OSC Publisher initialized - Multicasting to ${host}:${port}`);
      console.log(`📡 Mode: MULTICAST (IP Multicast Group)`);
    } else {
      const mode = host.endsWith('.255') ? 'BROADCAST' : 'UNICAST';
      console.log(`📡 OSC Publisher initialized - Sending to ${host}:${port}`);
      console.log(`📡 Mode: ${mode} (${host.endsWith('.255') ? 'subnet broadcast' : 'direct IP'})`);
    }
  }

  /**
   * Send OSC message for scene/fork transitions
   * Address: "/meander/state" 
   * Args: [nodeType, nodeName]
   */
  public stateChanged(nodeType: "scene" | "fork" | "opening" | "ending", nodeName: string) {
    console.log(`📡 OSC: Sending state change - Type: ${nodeType}, Name: ${nodeName}`);
    this.send([`/meander/state`, nodeType, nodeName]);
  }
  
  /**
   * Close the UDP socket
   */
  public close() {
    try {
      this.udpSocket.close();
      console.log('✅ OSC Publisher closed');
    } catch (error) {
      console.error('❌ Error closing OSC Publisher:', error);
    }
  }

  /**
   * Send OSC message for fork countdown
   * Address: "/meander/countdown"
   * Args: [forkName, countdown]
   */
  public forkCountdown(forkName: string, countdown: number) {
    console.log(`📡 OSC: Sending countdown - Fork: ${forkName}, Seconds: ${countdown}`);
    this.send([`/meander/countdown`, forkName, countdown]);
  }


  /**
   * Test method to verify OSC is working
   */
  public testMessage() {
    console.log('📡 OSC: Sending test message...');
    this.send(["/meander/test", "hello", 123]);
  }

  private send([address, ...args]: [string, ...any[]]) {
    try {
      console.log(`📡 OSC: Sending to ${this.host}:${this.port} - Address: ${address}, Args: [${args.join(', ')}]`);
      
      if (!this.isReady) {
        console.warn(`⚠️ UDP socket not ready yet, message may be queued`);
      }
      
      // Build and send OSC packet via native UDP socket
      const oscPacket = this.buildOscPacket(address, args);
      
      this.udpSocket.send(oscPacket, this.port, this.host, (err) => {
        if (err) {
          console.error(`❌ OSC send failed:`, err);
          console.error(`❌ Error code: ${(err as any).code}`);
          
          if ((err as any).code === 'EACCES') {
            console.error(`\n⚠️⚠️⚠️ PERMISSION DENIED ⚠️⚠️⚠️`);
            console.error(`Check OSC_HOST and OSC_MULTICAST settings in config.env`);
          }
        } else {
          console.log(`✅ OSC sent: ${address} -> ${this.host}:${this.port}`);
        }
      });
      
    } catch (error) {
      console.error(`❌ OSC: Failed to send message - Address: ${address}, Error:`, error);
    }
  }
  
  /**
   * Build an OSC packet manually for direct UDP sending
   */
  private buildOscPacket(address: string, args: any[]): Buffer {
    const buffers: Buffer[] = [];
    
    // Add address with null padding
    const addressBuffer = Buffer.from(address + '\0');
    const addressPadding = 4 - (addressBuffer.length % 4);
    buffers.push(addressBuffer);
    if (addressPadding < 4) {
      buffers.push(Buffer.alloc(addressPadding, 0));
    }
    
    // Build type tag string
    let typeTags = ',';
    args.forEach(arg => {
      if (typeof arg === 'number') {
        typeTags += Number.isInteger(arg) ? 'i' : 'f';
      } else if (typeof arg === 'string') {
        typeTags += 's';
      }
    });
    
    const typeTagBuffer = Buffer.from(typeTags + '\0');
    const typeTagPadding = 4 - (typeTagBuffer.length % 4);
    buffers.push(typeTagBuffer);
    if (typeTagPadding < 4) {
      buffers.push(Buffer.alloc(typeTagPadding, 0));
    }
    
    // Add arguments
    args.forEach(arg => {
      if (typeof arg === 'number') {
        const argBuf = Buffer.alloc(4);
        if (Number.isInteger(arg)) {
          argBuf.writeInt32BE(arg, 0);
        } else {
          argBuf.writeFloatBE(arg, 0);
        }
        buffers.push(argBuf);
      } else if (typeof arg === 'string') {
        const strBuf = Buffer.from(arg + '\0');
        const strPadding = 4 - (strBuf.length % 4);
        buffers.push(strBuf);
        if (strPadding < 4) {
          buffers.push(Buffer.alloc(strPadding, 0));
        }
      }
    });
    
    return Buffer.concat(buffers);
  }
}
