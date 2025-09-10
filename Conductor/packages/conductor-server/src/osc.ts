import OSC from "osc-js";

const DEFAULT_PORT = Number(process.env.OSC_PORT ?? 57121);

export class OscPublisher {
  private osc: OSC;

  constructor(port: number = DEFAULT_PORT) {
    this.osc = new OSC({ 
      plugin: new OSC.DatagramPlugin({ 
        send: { 
          port: port,
          host: '127.0.0.1'  // Explicitly set localhost
        },
        open: {
          port: port + 1,  // Use different port for receiving (not needed for sending)
          host: '127.0.0.1'
        }
      }) 
    });
    this.osc.open();
    console.log(`📡 OSC Publisher initialized on port ${port}`);
  }

  /**
   * Send OSC message for scene/fork transitions
   * Address: "/type" (where type is "scene" or "fork")
   * Message: scene name (as string)
   */
  public stateChanged(nodeType: "scene" | "fork", nodeName: string) {
    console.log(`📡 OSC: Sending state change - Address: /${nodeType}, Message: ${nodeName}`);
    this.send([`/${nodeType}`, nodeName]);
  }

  /**
   * Send OSC message for fork countdown
   * Address: "/name/countdown/" (where name is the fork node name)
   * Message: countdown (as integer)
   */
  public forkCountdown(forkName: string, countdown: number) {
    console.log(`📡 OSC: Sending countdown - Address: /${forkName}/countdown/, Message: ${countdown}`);
    this.send([`/${forkName}/countdown/`, countdown]);
  }


  /**
   * Test method to verify OSC is working
   */
  public testMessage() {
    console.log('📡 OSC: Sending test message...');
    this.send(["/test", "hello", 123]);
  }

  private send([address, ...args]: [string, ...any[]]) {
    try {
      const message = new OSC.Message(address, ...args);
      this.osc.send(message);
      console.log(`📡 OSC: Message sent successfully - Address: ${address}, Args: [${args.join(', ')}]`);
    } catch (error) {
      console.error(`❌ OSC: Failed to send message - Address: ${address}, Error:`, error);
    }
  }
}
