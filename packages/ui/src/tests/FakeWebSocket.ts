/** Minimal WebSocket implementation for application integration tests. */
export class FakeWebSocket {
  /** Close handler assigned by the application. */
  onclose: (() => void) | null = null
  /** Error handler assigned by the application. */
  onerror: (() => void) | null = null
  /** Message handler assigned by the application. */
  onmessage: ((event: MessageEvent) => void) | null = null
  /** Open handler assigned by the application. */
  onopen: (() => void) | null = null

  /** Close the fake connection. */
  close() {}
}
