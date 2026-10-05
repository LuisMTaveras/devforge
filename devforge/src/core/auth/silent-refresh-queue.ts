/**
 * ⚡ DEVFORGE Silent Refresh Queue
 * Manages concurrent 401 Unauthorized responses.
 * Queues simultaneous API calls while a single token refresh executes,
 * preventing race conditions and multiple refresh token calls.
 */

type RefreshPromiseExecutor = (token: string) => void;
type RejectPromiseExecutor = (error: unknown) => void;

interface QueuedRequest {
  resolve: RefreshPromiseExecutor;
  reject: RejectPromiseExecutor;
}

export class SilentRefreshQueue {
  private isRefreshing = false;
  private queue: QueuedRequest[] = [];

  /**
   * Enqueues a failed request to wait for the refresh process to complete.
   */
  enqueue(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.queue.push({ resolve, reject });
    });
  }

  /**
   * Returns true if a token refresh is currently in progress.
   */
  getIsRefreshing(): boolean {
    return this.isRefreshing;
  }

  /**
   * Sets the refresh status.
   */
  setIsRefreshing(value: boolean): void {
    this.isRefreshing = value;
  }

  /**
   * Resolves all queued requests with the freshly acquired access token.
   */
  resolveQueue(newToken: string): void {
    this.queue.forEach(({ resolve }) => resolve(newToken));
    this.queue = [];
    this.isRefreshing = false;
  }

  /**
   * Rejects all queued requests if the refresh token failed or expired.
   */
  rejectQueue(error: unknown): void {
    this.queue.forEach(({ reject }) => reject(error));
    this.queue = [];
    this.isRefreshing = false;
  }
}

export const refreshQueue = new SilentRefreshQueue();
