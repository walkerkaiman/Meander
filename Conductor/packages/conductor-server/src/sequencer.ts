import path from "path";
import { Level } from "level";
import { eventBus } from "./eventBus";
import { OscPublisher } from "./osc";
import { ActiveState, VotePayload } from "@meander/conductor-types";

// Extended connection shape used when the package explicitly defines graph edges
export interface Connection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  /** Index of the output that originates this edge (0 for scenes, 0/1/.. for fork choices) */
  fromOutputIndex: number;
  /** Optional human-readable label (typically fork choice text) */
  label?: string;
}

export interface ShowPackage {
  metadata: { initialStateId: string };
  nodes: Record<
    string,
    {
      id: string;
      type: "scene" | "fork";
      next?: string;
      choices?: Array<{ label?: string; nextStateId: string }>;
    }
  >;
  /**
   * Optional explicit connections section. When present, these edges will be
   * used verbatim instead of being derived from the node data.
   */
  connections?: Connection[];
}

export class Sequencer {
  private db: Level<string, string>;
  private current: ActiveState | null = null;
  private osc = new OscPublisher();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private show: ShowPackage | null = null;
  private timers = { showStart: null as number | null, sceneStart: null as number | null };
  private activeVotes: Map<string, Map<string, 0 | 1>> = new Map(); // forkId -> deviceId -> choiceIndex

  constructor(private dataDir: string) {
    console.log('🎭 Initializing Sequencer with data directory:', dataDir);
    const dbPath = path.join(dataDir, "db", "current");
    console.log('🎭 DB path:', dbPath);
    this.db = new Level(dbPath, { valueEncoding: "json" });
    console.log('🎭 Sequencer DB initialized, calling restore...');
    this.restore();

    // Heartbeat every 5 seconds
    this.heartbeatTimer = setInterval(() => this.osc.heartbeat(), 5000);

    // Listen for votes
    eventBus.on("voteReceived", ({ payload }) => this.onVote(payload));
  }

  private async restore() {
    console.log('🔄 Starting sequencer restore process...');
    try {
      // Restore current state
      console.log('🔄 Attempting to restore current state from database...');
      try {
        const snapshot = await this.db.get("current");
        this.current = snapshot as ActiveState;
        console.log('🔄 Raw current state from DB:', snapshot);
        console.log('✅ Successfully loaded current state from DB');
      } catch (currentError) {
        console.log('ℹ️ No saved current state found in database');
        this.current = null;
      }

      // Restore show data
      try {
        console.log('🔄 Attempting to restore show data from database...');
        const showData = await this.db.get("show");
        this.show = showData as ShowPackage;
        console.log('✅ Restored show data:', this.show ? 'loaded' : 'none');
        if (this.show) {
          console.log('✅ Show data details:', {
            hasNodes: !!this.show.nodes,
            hasStates: !!this.show.states,
            nodeCount: this.show.nodes ? Object.keys(this.show.nodes).length : (this.show.states ? this.show.states.length : 0)
          });

          // Restore graph snapshot
          console.log('🔄 Rebuilding graph snapshot from restored show data...');
          console.log('🔄 Show data format check - has nodes:', !!this.show.nodes, 'has states:', !!this.show.states);

          let states: any[] = [];
          let connections: any[] = [];

          // Handle both old format (states array) and new format (nodes object)
          if (this.show.nodes) {
            // New format
            console.log('🔄 Processing new format (nodes object)');
            states = Object.values(this.show.nodes).map((n: any, idx) => ({
              id: n.id,
              type: n.type,
              title: n.title ?? n.id,
              description: n.description ?? "",
              performerText: n.performerText ?? "",
              audienceText: n.audienceText ?? "",
              countdownSeconds: n.countdownSeconds ?? undefined,
              choices: n.choices ?? [],
              position: n.position ?? { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
              connections: n.connections ?? []
            }));

            // Skip building connections from node-level connections arrays if top-level connections exist
            // The node-level connections contain connection IDs, not target node IDs
            const hasTopLevelConnections = this.show.connections && Array.isArray(this.show.connections);
            
            if (!hasTopLevelConnections) {
              console.log('🔄 Building connections from node-level connections arrays (fallback mode)');
              // Build connections from node-level connections arrays
              const nodeIds = new Set(Object.keys(this.show.nodes)); // Track valid node IDs
              Object.values(this.show.nodes).forEach((n: any) => {
                if (n.connections && Array.isArray(n.connections)) {
                  n.connections.forEach((targetId: string, idx: number) => {
                    // Only include connections that point to existing nodes
                    if (nodeIds.has(targetId)) {
                      // Get label from choices if this is a fork node
                      let label = '';
                      if (n.type === 'fork' && n.choices && n.choices[idx]) {
                        label = n.choices[idx].label || '';
                      }

                      connections.push({
                        id: `${n.id}-${idx}->${targetId}`,
                        fromNodeId: n.id,
                        toNodeId: targetId,
                        fromOutputIndex: idx,
                        label: label
                      });
                    } else {
                      console.log(`⚠️ Skipping connection from ${n.id} to non-existent node ${targetId}`);
                    }
                  });
                }
              });
            } else {
              console.log('🔄 Top-level connections array found, skipping node-level connections processing');
            }
          } else if (this.show.states) {
            // Old format
            console.log('🔄 Processing old format (states array)');
            states = this.show.states.map((n: any, idx) => ({
              id: n.id,
              type: n.type,
              title: n.title ?? n.id,
              description: n.description ?? "",
              performerText: n.performerText ?? "",
              audienceText: n.audienceText ?? "",
              countdownSeconds: n.countdownSeconds ?? undefined,
              choices: n.choices ?? [],
              position: n.position ?? { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
              connections: n.connections ?? []
            }));

            // Build connections from old format (next/choices)
            this.show.states.forEach((n: any) => {
              if (n.type === "scene" && n.next && nodeIds.has(n.next)) {
                connections.push({
                  id: `${n.id}->${n.next}`,
                  fromNodeId: n.id,
                  toNodeId: n.next,
                  fromOutputIndex: 0,
                  label: ""
                });
              } else if (n.type === "scene" && n.next && !nodeIds.has(n.next)) {
                console.log(`⚠️ Skipping scene connection from ${n.id} to non-existent node ${n.next}`);
              }

              if (n.type === "fork" && n.choices) {
                n.choices.forEach((c: any, idx: number) => {
                  if (c.nextStateId && nodeIds.has(c.nextStateId)) {
                    connections.push({
                      id: `${n.id}-${idx}->${c.nextStateId}`,
                      fromNodeId: n.id,
                      toNodeId: c.nextStateId,
                      fromOutputIndex: idx,
                      label: c.label || ""
                    });
                  } else if (c.nextStateId && !nodeIds.has(c.nextStateId)) {
                    console.log(`⚠️ Skipping fork choice connection from ${n.id} to non-existent node ${c.nextStateId}`);
                  }
                });
              }
            });
          }

          // Use the top-level connections array from show.json
          let restoredConnections: Array<any> = [];
          const nodeIds = new Set(Object.keys(this.show.nodes)); // Track valid node IDs

          if (this.show.connections && Array.isArray(this.show.connections)) {
            console.log('🔄 Using top-level connections array from show.json in restore');
            restoredConnections = this.show.connections
              .filter((conn: any) => {
                // Only include connections where both source and target nodes exist
                const sourceExists = nodeIds.has(conn.fromNodeId);
                const targetExists = nodeIds.has(conn.toNodeId);
                if (!sourceExists || !targetExists) {
                  console.log(`⚠️ Skipping connection from ${conn.fromNodeId} to ${conn.toNodeId} (source: ${sourceExists}, target: ${targetExists})`);
                  return false;
                }
                return true;
              })
              .map((conn: any) => {
                // Get label from choices if this is a fork node
                let label = conn.label || '';
                if (!label) {
                  const fromNode = this.show.nodes[conn.fromNodeId];
                  if (fromNode && fromNode.type === 'fork' && fromNode.choices && fromNode.choices[conn.fromOutputIndex]) {
                    label = fromNode.choices[conn.fromOutputIndex].label || `Choice ${conn.fromOutputIndex + 1}`;
                  }
                }

                return {
                  id: conn.id,
                  fromNodeId: conn.fromNodeId,
                  toNodeId: conn.toNodeId,
                  fromOutputIndex: conn.fromOutputIndex || 0,
                  label: label
                };
              });
          } else {
            console.log('🔄 No top-level connections array in restore, using node-level connections');
            // Use the connections built from node-level data (fallback mode)
            restoredConnections = connections;
          }

          console.log('🔄 Built states array:', states.map(s => ({ id: s.id, type: s.type })));
          console.log('🔄 Built connections array:', restoredConnections.map(c => ({ from: c.fromNodeId, to: c.toNodeId })));

          // Import the snapshot object to ensure we're using the same instance as the routes
          const { snapshot } = require("./routes/audience");
          snapshot.graph = { 
            states, 
            connections: restoredConnections,
            nodes: this.show.nodes,  // Full node data for audience page
            metadata: this.show.metadata
          };
          console.log('✅ Restored graph snapshot with', states.length, 'states and', restoredConnections.length, 'connections');
        }
        console.log('✅ Successfully loaded show data from DB');
      } catch (showError) {
        console.log('ℹ️ No saved show data found in database');
        this.show = null;
      }

      if (this.current) {
        // Verify the current state node exists in the restored graph
        let nodeExists = false;
        if (this.show?.nodes && this.show.nodes[this.current.id]) {
          nodeExists = true;
        } else if (this.show?.states && this.show.states.find((s: any) => s.id === this.current.id)) {
          nodeExists = true;
        }

        if (nodeExists) {
          // Also restore current state in the snapshot
          const { snapshot } = require("./routes/audience");
          snapshot.activeState = this.current;
          console.log('✅ Restored current state in snapshot:', this.current);

          eventBus.emit("stateChanged", this.current);
          console.log('✅ Emitted stateChanged event for restored state:', this.current);
        } else {
          console.log('⚠️ Current state node does not exist in restored graph, clearing current state');
          this.current = null;
          const { snapshot } = require("./routes/audience");
          snapshot.activeState = null;
        }
      } else {
        console.log('ℹ️ No current state to restore');
      }
    } catch (error) {
      console.log('ℹ️ No saved state found');
    }
  }

  public loadShow(show: ShowPackage) {
    this.show = show;
    // reset timers for fresh show
    this.timers.showStart = Date.now();
    this.timers.sceneStart = null;
    // Handle both possible initial state locations
    const initialStateId = show.metadata?.initialStateId || show.show?.initialStateId;
    if (!initialStateId) {
      throw new Error('No initial state ID found in show data');
    }
    if (!show.nodes[initialStateId]) {
      throw new Error(`Initial state ${initialStateId} not found in nodes`);
    }
    this.current = { id: initialStateId, type: show.nodes[initialStateId].type } as ActiveState;
    if (this.current.type === "scene") {
      this.timers.sceneStart = Date.now();
    }
    // Build simple graph format for conductor-client
    const states = Object.values(show.nodes).map((n, idx) => ({
      id: n.id,
      type: n.type,
      title: (n as any).title ?? n.id,
      description: (n as any).description ?? "",
      performerText: (n as any).performerText ?? "",
      audienceText: (n as any).audienceText ?? "",
      countdownSeconds: (n as any).countdownSeconds ?? undefined,
      choices: (n as any).choices ?? [],
      position: (n as any).position ?? { x: (idx % 5) * 200 + 100, y: Math.floor(idx / 5) * 150 + 100 },
      audienceMedia: ((n as any).audienceMedia ?? []).map((m: any) => {
        const rawName = typeof m === "string" ? m : m.file ?? "";
        const filename = rawName.replace(/^assets[\\/]/, "");
        return `/media/${filename}`;
      }),
    }));
    // Use the top-level connections array from show.json
    let connections: Array<any> = [];
    const nodeIds = new Set(Object.keys(show.nodes)); // Track valid node IDs

    if (show.connections && Array.isArray(show.connections)) {
      console.log('🔄 Using top-level connections array from show.json');
      connections = show.connections
        .filter((conn: any) => {
          // Only include connections where both source and target nodes exist
          const sourceExists = nodeIds.has(conn.fromNodeId);
          const targetExists = nodeIds.has(conn.toNodeId);
          if (!sourceExists || !targetExists) {
            console.log(`⚠️ Skipping connection from ${conn.fromNodeId} to ${conn.toNodeId} (source: ${sourceExists}, target: ${targetExists})`);
            return false;
          }
          return true;
        })
        .map((conn: any) => {
          // Get label from choices if this is a fork node
          let label = conn.label || '';
          if (!label) {
            const fromNode = show.nodes[conn.fromNodeId];
            if (fromNode && fromNode.type === 'fork' && fromNode.choices && fromNode.choices[conn.fromOutputIndex]) {
              label = fromNode.choices[conn.fromOutputIndex].label || `Choice ${conn.fromOutputIndex + 1}`;
            }
          }

          return {
            id: conn.id,
            fromNodeId: conn.fromNodeId,
            toNodeId: conn.toNodeId,
            fromOutputIndex: conn.fromOutputIndex || 0,
            label: label
          };
        });
    } else {
      // Fallback to node-level connections if no top-level connections array
      console.log('🔄 No top-level connections array, using node-level connections');
      Object.values(show.nodes).forEach((n: any) => {
        if (n.connections && Array.isArray(n.connections)) {
          n.connections.forEach((targetId: string, idx: number) => {
            if (nodeIds.has(targetId)) {
              let label = '';
              if (n.type === 'fork' && n.choices && n.choices[idx]) {
                label = n.choices[idx].label || '';
              }

              connections.push({
                id: `${n.id}-${idx}->${targetId}`,
                fromNodeId: n.id,
                toNodeId: targetId,
                fromOutputIndex: idx,
                label: label
              });
            } else {
              console.log(`⚠️ Skipping connection from ${n.id} to non-existent node ${targetId}`);
            }
          });
        }
      });
    }

    // If no valid connections found, create a simple linear flow between existing nodes
    if (connections.length === 0 && states.length > 1) {
      console.log('🔄 No valid connections found, creating simple linear flow...');

      // Simple approach: connect each node to the next node in sequence
      for (let i = 0; i < states.length - 1; i++) {
        const fromNode = states[i];
        const toNode = states[i + 1];

        // For Fork nodes, create one connection per choice to the same target
        if (fromNode.type === 'fork' && fromNode.choices && fromNode.choices.length > 0) {
          fromNode.choices.forEach((choice: any, choiceIdx: number) => {
            connections.push({
              id: `${fromNode.id}-${choiceIdx}->${toNode.id}`,
              fromNodeId: fromNode.id,
              toNodeId: toNode.id,
              fromOutputIndex: choiceIdx,
              label: choice.label || `Choice ${choiceIdx + 1}`
            });

            console.log(`🔄 Created fork fallback connection: ${fromNode.id} [${choice.label || `Choice ${choiceIdx + 1}`}] -> ${toNode.id}`);
          });
        } else {
          // For Scene nodes, create single connection
          connections.push({
            id: `${fromNode.id}->${toNode.id}`,
            fromNodeId: fromNode.id,
            toNodeId: toNode.id,
            fromOutputIndex: 0,
            label: ''
          });

          console.log(`🔄 Created scene fallback connection: ${fromNode.id} -> ${toNode.id}`);
        }
      }

      console.log(`🔄 Created ${connections.length} fallback connections in linear sequence`);
      connections.forEach((conn, idx) => {
        console.log(`🔗 [${idx}] ${conn.fromNodeId} -> ${conn.toNodeId} (output: ${conn.fromOutputIndex}, label: "${conn.label}")`);
      });
    }

    console.log('📊 Updating graph snapshot in audience routes...');
    console.log('📊 States to set:', states.length, 'states:', states.map(s => s.id));
    console.log('📊 Connections to set:', connections.length, 'connections:', connections.map(c => `${c.fromNodeId} -> ${c.toNodeId}`));

    const { snapshot } = require("./routes/audience");
    // Include both simplified states for conductor-client and full nodes for audience-page
    snapshot.graph = { 
      states, 
      connections,
      nodes: show.nodes,  // Full node data for audience page
      metadata: show.metadata
    };
    console.log('📊 Graph snapshot updated in audience routes with full node data');

    this.persist();
    // Persist the show data
    this.persistShow();
    eventBus.emit("showLoaded", { showId: "local" });
    eventBus.emit("stateChanged", this.current);
  }

  public manualAdvance() {
    console.log('🎯 MANUAL ADVANCE called');
    console.log('Current state object:', this.current);
    if (!this.current) {
      console.log('❌ No current state to advance from');
      return;
    }

    console.log('Current node ID:', this.current.id, 'Type:', this.current.type);
    const nextId = this.computeNext(this.current.id);
    console.log('📍 Next ID computed:', nextId, 'from current:', this.current.id);

    if (nextId === this.current.id) {
      console.log('⚠️ WARNING: Next ID is the same as current ID!');
    }

    this.advance(nextId);
  }

  private advance(nextId: string) {
    console.log('🚀 ADVANCE method called with nextId:', nextId);
    if (!this.current) {
      console.log('❌ No current state in advance method');
      return;
    }

    // Determine the actual node type from the show graph
    let nodeType: "scene" | "fork" = "scene"; // default fallback
    let nextNode;

    if (this.show && this.show.nodes && this.show.nodes[nextId]) {
      // New format
      nextNode = this.show.nodes[nextId];
      nodeType = nextNode.type;
      console.log('✅ Node type determined from new format:', nodeType, 'for node:', nextId);
    } else if (this.show && this.show.states) {
      // Old format
      nextNode = this.show.states.find((s: any) => s.id === nextId);
      if (nextNode) {
        nodeType = nextNode.type;
        console.log('✅ Node type determined from old format:', nodeType, 'for node:', nextId);
      } else {
        console.log('⚠️ Next node not found, using fallback "scene"');
      }
    } else {
      console.log('⚠️ Could not determine node type, using fallback "scene"');
    }

    const oldState = this.current;
    this.current = { id: nextId, type: nodeType } as ActiveState;
    console.log('🔄 State changed from:', oldState, 'to:', this.current);

    if (nodeType === "scene") {
      this.timers.sceneStart = Date.now();
    }

    this.persist();
    // OSC broadcast
    const path = nodeType === "scene" ? `/scene/${nextId}` : `/fork/${nextId}`;
    this.osc.stateChanged(path);

    console.log('📡 Broadcasting stateChanged event:', this.current);
    eventBus.emit("stateChanged", this.current);
  }

  private computeNext(currentId: string): string {
    console.log('🔍 computeNext called for:', currentId);
    console.log('🔍 Show data format check - has nodes:', !!this.show?.nodes, 'has states:', !!this.show?.states);

    if (!this.show) {
      console.log('❌ No show data available');
      return currentId;
    }

    // Handle both old format (states array) and new format (nodes object)
    let node;
    if (this.show.nodes && this.show.nodes[currentId]) {
      // New format
      node = this.show.nodes[currentId];
      console.log('✅ Found node in new format (nodes):', node);
      console.log('✅ Node connections:', node.connections);
    } else if (this.show.states) {
      // Old format - find node in states array
      node = this.show.states.find((s: any) => s.id === currentId);
      console.log('✅ Found node in old format (states):', node);
      console.log('✅ Node connections (old format):', node?.connections);
    }

    if (!node) {
      console.log('❌ Node not found:', currentId);
      if (this.show.nodes) {
        console.log('❌ Available nodes (new format):', Object.keys(this.show.nodes));
      } else if (this.show.states) {
        console.log('❌ Available nodes (old format):', this.show.states.map((s: any) => s.id));
      }
      return currentId;
    }

    if (node.type === "scene") {
      // Use graph connections instead of node-level connections
      let nextId = currentId;

      console.log('🎯 Scene node processing, looking up graph connections...');
      
      // Look up connections from the graph snapshot
      const { snapshot } = require("./routes/audience");
      const graphConnections = snapshot.graph?.connections || [];
      console.log('🎯 Available graph connections:', graphConnections.length);
      
      // Find connection from current node
      const outgoingConnection = graphConnections.find((conn: any) => conn.fromNodeId === currentId);
      
      if (outgoingConnection) {
        nextId = outgoingConnection.toNodeId;
        console.log('🎯 Scene node, using graph connection:', nextId, 'from connection:', outgoingConnection.id);

        // Verify the target node exists in show data
        let targetExists = false;
        if (this.show.nodes && this.show.nodes[nextId]) {
          targetExists = true;
          console.log('✅ Target node exists in show data');
        } else if (this.show.states && this.show.states.find((s: any) => s.id === nextId)) {
          targetExists = true;
          console.log('✅ Target node exists in show data');
        }

        if (!targetExists) {
          console.log('⚠️ WARNING: Target node', nextId, 'does not exist in show data!');
          console.log('⚠️ Available nodes:', this.show.nodes ? Object.keys(this.show.nodes) : this.show.states?.map((s: any) => s.id));
          return currentId; // Don't advance to non-existent node
        }

      } else {
        console.log('⚠️ Scene node has no outgoing connections in graph, staying at current:', currentId);
        console.log('🔍 Graph connections from this node:', graphConnections.filter((c: any) => c.fromNodeId === currentId));
      }

      return nextId;
    }

    // If fork - for manual advance we default to first connection
    if (node.type === "fork") {
      let nextId = currentId;

      console.log('🎯 Fork node processing, looking up graph connections...');
      
      // Look up connections from the graph snapshot
      const { snapshot } = require("./routes/audience");
      const graphConnections = snapshot.graph?.connections || [];
      
      // Find connections from current fork node (forks can have multiple outgoing connections)
      const outgoingConnections = graphConnections.filter((conn: any) => conn.fromNodeId === currentId);
      
      if (outgoingConnections.length > 0) {
        // Use first connection for manual advance (default path)
        nextId = outgoingConnections[0].toNodeId;
        console.log('🎯 Fork node, using first graph connection:', nextId, 'from', outgoingConnections.length, 'available connections');

        // Verify the target node exists
        let targetExists = false;
        if (this.show.nodes && this.show.nodes[nextId]) {
          targetExists = true;
          console.log('✅ Fork target node exists in show data');
        } else if (this.show.states && this.show.states.find((s: any) => s.id === nextId)) {
          targetExists = true;
          console.log('✅ Fork target node exists in show data');
        }

        if (!targetExists) {
          console.log('⚠️ WARNING: Fork target node', nextId, 'does not exist in show data!');
          return currentId; // Don't advance to non-existent node
        }

      } else if (node.choices && node.choices.length > 0) {
        // Fallback to choices if graph connections don't exist
        nextId = node.choices[0].nextStateId;
        console.log('🎯 Fork node, using first choice (fallback):', nextId);
        console.log('Fork choices:', node.choices);
      } else {
        console.log('⚠️ Fork node has no graph connections or choices, staying at current:', currentId);
        console.log('🔍 Available graph connections from this node:', outgoingConnections);
      }

      return nextId;
    }

    console.log('❓ No next ID found, returning current:', currentId);
    console.log('Node type:', node.type, 'has choices:', !!node.choices);
    return currentId;
  }

  private persist() {
    if (this.current) {
      console.log('💾 Persisting current state to DB:', this.current);
      this.db.put("current", this.current)
        .then(() => console.log('✅ Successfully persisted current state'))
        .catch(error => console.error('❌ Failed to persist current state:', error));
    } else {
      console.log('💾 No current state to persist');
    }
  }

  private persistShow() {
    if (this.show) {
      console.log('💾 Persisting show data to DB:', {
        hasNodes: !!this.show.nodes,
        hasStates: !!this.show.states,
        nodeCount: this.show.nodes ? Object.keys(this.show.nodes).length : (this.show.states ? this.show.states.length : 0)
      });
      this.db.put("show", this.show)
        .then(() => console.log('✅ Successfully persisted show data'))
        .catch(error => console.error('❌ Failed to persist show data:', error));
    } else {
      console.log('💾 No show data to persist');
    }
  }

  private onVote(payload: VotePayload) {
    console.log('🗳️ Vote received:', payload);

    // Initialize vote tracking for this fork if not exists
    if (!this.activeVotes.has(payload.forkId)) {
      this.activeVotes.set(payload.forkId, new Map());
    }

    const forkVotes = this.activeVotes.get(payload.forkId)!;

    // Store the vote (deviceId -> choiceIndex)
    forkVotes.set(payload.deviceId, payload.choiceIndex);

    console.log('🗳️ Vote stored. Current votes for fork', payload.forkId, ':',
      Array.from(forkVotes.entries()).map(([deviceId, choice]) => ({ deviceId, choice })));
  }

  /**
   * Tally votes for a fork and determine the winner
   */
  public tallyVotes(forkId: string): { counts: [number, number], winnerIndex: 0 | 1 } {
    const forkVotes = this.activeVotes.get(forkId);

    if (!forkVotes || forkVotes.size === 0) {
      console.log('🗳️ No votes found for fork', forkId, '- defaulting to choice 0');
      return { counts: [0, 0], winnerIndex: 0 };
    }

    // Count votes for each choice
    let choice0Count = 0;
    let choice1Count = 0;

    for (const [deviceId, choice] of forkVotes.entries()) {
      if (choice === 0) {
        choice0Count++;
      } else if (choice === 1) {
        choice1Count++;
      } else {
        console.log('🗳️ ERROR: Invalid choice index:', choice, 'from device:', deviceId);
      }
    }

    const counts: [number, number] = [choice0Count, choice1Count];
    const winnerIndex: 0 | 1 = choice0Count >= choice1Count ? 0 : 1;

    console.log('🗳️ Vote tally for fork', forkId, ':', {
      totalVotes: forkVotes.size,
      choice0Votes: choice0Count,
      choice1Votes: choice1Count,
      winner: winnerIndex
    });

    // Clear votes for this fork after tallying
    this.activeVotes.delete(forkId);

    return { counts, winnerIndex };
  }

  /**
   * Advance to the next state based on the winning choice
   */
  public advanceToChoice(forkId: string, winningChoiceIndex: 0 | 1): void {
    console.log('🎯 Advancing to choice', winningChoiceIndex, 'for fork', forkId);
    
    if (!this.show || !this.current || this.current.id !== forkId) {
      console.error('❌ Cannot advance: invalid state or fork ID mismatch');
      return;
    }
    
    // Handle both old format (states array) and new format (nodes object)
    let forkNode: any;
    if (this.show.nodes && this.show.nodes[forkId]) {
      // New format
      forkNode = this.show.nodes[forkId];
      console.log('🎯 Found fork node in new format (nodes)');
    } else if (this.show.states) {
      // Old format
      forkNode = this.show.states.find((s: any) => s.id === forkId);
      console.log('🎯 Found fork node in old format (states)');
    }
    
    if (!forkNode || forkNode.type !== 'fork') {
      console.error('❌ Cannot advance: node is not a fork or not found');
      console.error('❌ Fork node:', forkNode);
      console.error('❌ Available nodes:', this.show.nodes ? Object.keys(this.show.nodes) : this.show.states?.map((s: any) => s.id));
      return;
    }
    
    const choices = (forkNode as any).choices;

    if (!choices || !choices[winningChoiceIndex]) {
      console.error('❌ Cannot advance: invalid choice index', winningChoiceIndex);
      console.error('❌ Available choices:', choices);
      console.error('❌ Choices array length:', choices ? choices.length : 'undefined');
      return;
    }

    const nextStateId = choices[winningChoiceIndex].nextStateId;
    console.log('🎯 Advancing from fork', forkId, 'to state', nextStateId, 'based on choice', winningChoiceIndex);
    console.log('🎯 Choice details:', {
      choiceIndex: winningChoiceIndex,
      choiceLabel: choices[winningChoiceIndex].label,
      nextStateId: nextStateId
    });
    
    // Advance to the next state
    this.advance(nextStateId);
  }

  /**
   * Reset to a specific state (used by reset endpoint)
   */
  public resetToState(stateId: string): void {
    console.log('🔄 Resetting to state:', stateId);
    console.log('🔍 Current sequencer state:', {
      hasShow: !!this.show,
      currentState: this.current,
      showFormat: this.show ? (this.show.nodes ? 'new' : this.show.states ? 'old' : 'unknown') : 'no show'
    });

    if (!this.show) {
      console.error('❌ No show data loaded in sequencer');
      throw new Error('No show data loaded');
    }

    // Handle both old format (states array) and new format (nodes object)
    let targetState: any;
    if (this.show.nodes && this.show.nodes[stateId]) {
      // New format
      targetState = this.show.nodes[stateId];
      console.log('🎯 Found target state in new format (nodes):', targetState);
    } else if (this.show.states) {
      // Old format
      targetState = this.show.states.find((s: any) => s.id === stateId);
      console.log('🎯 Found target state in old format (states):', targetState);
    }

    if (!targetState) {
      console.error('❌ Target state not found:', stateId);
      console.error('🔍 Available states:', this.show.nodes ? Object.keys(this.show.nodes) : this.show.states?.map((s: any) => s.id));
      throw new Error(`Target state ${stateId} not found`);
    }

    // Set the current state to the target state
    this.current = { id: stateId, type: targetState.type } as ActiveState;

    // Reset timers
    this.timers.showStart = Date.now();
    if (this.current.type === "scene") {
      this.timers.sceneStart = Date.now();
    }

    // Clear any active votes
    this.activeVotes.clear();

    // Broadcast the new state change
    eventBus.emit("stateChanged", this.current);

    console.log('✅ Successfully reset to state:', stateId, 'type:', targetState.type);
  }
}
