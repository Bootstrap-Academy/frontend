import { cloneJson } from "./schema";
import { ProtocolError, type Clock, type Envelope, type Transport } from "./types";

/** Isolated test endpoints; production transports must establish origin/source ownership. */
export function createTestTransportPair() {
  const listeners = [new Set<(value: unknown) => void>(), new Set<(value: unknown) => void>()];
  const closed = [false, false];
  const messages: { sender: "host" | "lesson"; message: Envelope }[] = [];
  const endpoint = (side: number): Transport => ({
    send(message) {
      if (closed[side] || closed[1 - side])
        throw new ProtocolError("offline", "Transport closed.", true);
      messages.push({ sender: side === 0 ? "host" : "lesson", message: cloneJson(message) });
      for (const listener of listeners[1 - side]) listener(cloneJson(message));
    },
    subscribe(listener) {
      listeners[side].add(listener);
      return () => {
        listeners[side].delete(listener);
      };
    },
    close() {
      closed[side] = true;
      listeners[side].clear();
    },
  });
  return {
    host: endpoint(0),
    lesson: endpoint(1),
    messages,
    listenerCount: () => listeners[0].size + listeners[1].size,
  };
}

export class VirtualClock implements Clock {
  now = 0;
  private nextId = 0;
  private timers = new Map<number, { at: number; callback: () => void }>();
  setTimeout(callback: () => void, milliseconds: number): number {
    const id = ++this.nextId;
    this.timers.set(id, { at: this.now + milliseconds, callback });
    return id;
  }
  clearTimeout(handle: unknown): void {
    this.timers.delete(handle as number);
  }
  advanceTo(time: number): void {
    if (!Number.isFinite(time) || time < this.now) throw new Error("Clock cannot move backwards.");
    for (;;) {
      const next = [...this.timers]
        .filter(([, timer]) => timer.at <= time)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      this.now = next[1].at;
      this.timers.delete(next[0]);
      next[1].callback();
    }
    this.now = time;
  }
  get pending(): number {
    return this.timers.size;
  }
}
