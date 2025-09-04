import OSC from "osc-js";

const DEFAULT_PORT = Number(process.env.OSC_PORT ?? 57121);

export class OscPublisher {
  private osc: OSC;

  constructor(port: number = DEFAULT_PORT) {
    this.osc = new OSC({ plugin: new OSC.DatagramPlugin({ send: { port } }) });
    this.osc.open();
  }

  public stateChanged(path: string) {
    this.send([path]);
  }

  public heartbeat() {
    this.send(["/meander/heartbeat"]);
  }

  private send([address, ...args]: [string, ...any[]]) {
    const message = new OSC.Message(address, ...args);
    this.osc.send(message);
  }
}
