import type { FlickerlessOptions, FlickerlessStatus } from './types';

// `performance` no está en todos los entornos (ni en los tipos sin DOM).
const now = (): number => (globalThis as { performance?: { now(): number } }).performance?.now() ?? Date.now();

export class FlickerlessController {
  private options: FlickerlessOptions;
  private isVisibleLoading: boolean = false;
  private delayTimer: ReturnType<typeof setTimeout> | null = null;
  private minDurationTimer: ReturnType<typeof setTimeout> | null = null;
  private showStartTime: number = 0;

  constructor(options: FlickerlessOptions) {
    this.options = {
      delayMs: 180,
      minDurationMs: 250,
      keepPreviousData: true,
      ...options,
    };

    if (this.options.loading) {
      this.handleLoadingStart();
    }
  }

  public update(options: Partial<FlickerlessOptions>): void {
    const prevLoading = this.options.loading;
    this.options = { ...this.options, ...options };

    if (!prevLoading && this.options.loading) {
      this.handleLoadingStart();
    } else if (prevLoading && !this.options.loading) {
      this.handleLoadingEnd();
    } else {
      this.notifyState();
    }
  }

  private handleLoadingStart(): void {
    if (this.minDurationTimer) {
      clearTimeout(this.minDurationTimer);
      this.minDurationTimer = null;
    }

    const delay = this.options.delayMs ?? 180;
    if (delay <= 0) {
      this.setVisible(true);
      return;
    }

    this.delayTimer = setTimeout(() => {
      this.setVisible(true);
      this.delayTimer = null;
    }, delay);
  }

  private handleLoadingEnd(): void {
    if (this.delayTimer) {
      clearTimeout(this.delayTimer);
      this.delayTimer = null;
      // Finished before delay threshold -> Never show loading indicator! (Zero flicker)
      this.setVisible(false);
      return;
    }

    const minDuration = this.options.minDurationMs ?? 250;
    const elapsed = now() - this.showStartTime;

    if (elapsed < minDuration && this.isVisibleLoading) {
      const remaining = minDuration - elapsed;
      this.minDurationTimer = setTimeout(() => {
        this.setVisible(false);
        this.minDurationTimer = null;
      }, remaining);
    } else {
      this.setVisible(false);
    }
  }

  private setVisible(visible: boolean): void {
    if (this.isVisibleLoading === visible) return;
    this.isVisibleLoading = visible;
    if (visible) {
      this.showStartTime = now();
    }
    this.notifyState();
  }

  public getStatus(): FlickerlessStatus {
    if (this.options.error) return 'error';
    if (this.isVisibleLoading) return 'loading';
    if (this.options.empty) return 'empty';
    return 'idle';
  }

  public getIsVisibleLoading(): boolean {
    return this.isVisibleLoading;
  }

  private notifyState(): void {
    if (this.options.onStateChange) {
      this.options.onStateChange({
        isVisibleLoading: this.isVisibleLoading,
        status: this.getStatus(),
      });
    }
  }

  public destroy(): void {
    if (this.delayTimer) clearTimeout(this.delayTimer);
    if (this.minDurationTimer) clearTimeout(this.minDurationTimer);
  }
}
