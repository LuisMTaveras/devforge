# ⚡ BLUEPRINT 05: In-App DevTools & Scenario Cockpit

## 🎯 Goal

Provide a floating developer toolbar (active only in development: `import.meta.env.DEV` in Vite) to:

1. Switch active user/role in one click without logging out.
2. Inject simulated network latency (e.g. 1.5s 3G throttle).
3. Force HTTP error states (simulate 401 Unauthorized, 403 Forbidden, 500 Server Error) to verify UI resilience and toast notifications.

---

## 🛠️ Architecture

- A lightweight drawer anchored to the bottom-right of the screen.
- A centralized DevContext / DevStore that hooks into the application's HTTP client or MSW.

---

## 📋 Implementation

### 1. DevStore State (Zustand / Pinia / Pure JS)

```typescript
export interface DevToolsState {
  simulatedLatencyMs: number;
  forcedErrorStatus: number | null; // e.g. 500, 401, 403, or null
  activeRole: 'admin' | 'editor' | 'viewer';
}

export const devState: DevToolsState = {
  simulatedLatencyMs: 0,
  forcedErrorStatus: null,
  activeRole: 'admin',
};
```

### 2. HTTP Interceptor Hook

Attach this middleware to your Axios instance or Fetch wrapper:

```typescript
export async function devToolsNetworkInterceptor(config: RequestInit) {
  if (import.meta.env.DEV) {
    // 1. Injected Latency
    if (devState.simulatedLatencyMs > 0) {
      await new Promise(r => setTimeout(r, devState.simulatedLatencyMs));
    }
    // 2. Forced Error
    if (devState.forcedErrorStatus) {
      throw new Error(`[DEVTOOLS SIMULATION] HTTP ${devState.forcedErrorStatus}`);
    }
  }
  return config;
}
```

### 3. Floating UI Widget (Vue 3 / React)

```tsx
// Active only in development:
export function DevToolsCockpit() {
  if (!import.meta.env.DEV) return null;

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 99999 }}>
      {/* Collapsible badge that expands into Role switcher, Latency slider, Error trigger */}
    </div>
  );
}
```

---

## 🤖 Instructions for AI Agents

- Ensure this component is never bundled or rendered in production builds: in Vite use `import.meta.env.DEV`; use `process.env.NODE_ENV === 'development'` only in Next.js / Node-based setups.
- This blueprint is a pattern, not an installable module: there is no `devforge add devtools`. Build it only if the user asks for it.
- The widget must work in light and dark themes (tokens from `.ai/standards/theming.md`) and its labels must be in Spanish (Rol, Latencia, Forzar error).
- Connect role switching directly to `globalAbility.updateRules()`.
