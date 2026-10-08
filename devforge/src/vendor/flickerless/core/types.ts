export type FlickerlessStatus = 'idle' | 'loading' | 'error' | 'empty';

export interface FlickerlessOptions {
  /**
   * Whether data is currently loading / refetching.
   */
  loading: boolean;

  /**
   * Whether this is a cold initial load (no previous data in memory).
   * Defaults to false if data exists.
   */
  initialLoading?: boolean;

  /**
   * Anti-flicker threshold in milliseconds. If loading finishes within this duration,
   * no loading indicator is ever rendered, eliminating micro-flashes.
   * Default: 180ms.
   */
  delayMs?: number;

  /**
   * Minimum duration in milliseconds to keep the indicator visible once rendered,
   * avoiding sub-frame flickering.
   * Default: 250ms.
   */
  minDurationMs?: number;

  /**
   * Retain previous child content visible at attenuated opacity during refetching.
   * Default: true.
   */
  keepPreviousData?: boolean;

  /**
   * Custom height of the stream bar (e.g. '2px', '3px').
   * Default: '2px'.
   */
  streamHeight?: string;

  /**
   * Custom stream bar color / gradient.
   * Default: uses CSS variable --flickerless-stream-color.
   */
  streamColor?: string;

  /**
   * Whether the current dataset is empty (0 results).
   */
  empty?: boolean;

  /**
   * Error state if query failed.
   */
  error?: boolean | Error | string | null;

  /**
   * Callback fired when visible loading state changes.
   */
  onStateChange?: (state: { isVisibleLoading: boolean; status: FlickerlessStatus }) => void;
}
