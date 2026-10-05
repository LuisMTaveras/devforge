# ⚡ BLUEPRINT 06: Enterprise Authentication & Silent Refresh Queue

## 🎯 Goal

Implement robust session management with automatic, silent token refresh. When access tokens expire and multiple API calls execute in parallel, queue them behind a single refresh request to eliminate race conditions and avoid dropping active user sessions.

---

## 🛠️ Architecture Overview

```text
[Component API Call 1] ──┐
[Component API Call 2] ──┼──► [Axios / Fetch Interceptor]
[Component API Call 3] ──┘                 │
                                    (401 Unauthorized)
                                           │
                                  [SilentRefreshQueue]
                                  - Request 1 triggers /auth/refresh
                                  - Request 2 & 3 enter wait queue
                                           │
                                 (New Token Received)
                                           │
                             - Resolve queue with new token
                             - Retry Request 1, 2, and 3 cleanly
```

---

## 📋 Implementation Guide

### 1. The Axios Interceptor Setup (`src/core/api/http.ts`)

```typescript
import axios from 'axios';
import { tokenStorage } from '@/core/auth/auth-token';
import { refreshQueue } from '@/core/auth/silent-refresh-queue';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
});

// 1. Request Interceptor: Attach Access Token
http.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Response Interceptor: Handle 401 & Silent Refresh
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loop if the refresh endpoint itself failed
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/refresh')) {
        tokenStorage.clearSession();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      // If refresh is already in progress, wait in the queue
      if (refreshQueue.getIsRefreshing()) {
        const newToken = await refreshQueue.enqueue();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return http(originalRequest);
      }

      // Initiate Refresh
      refreshQueue.setIsRefreshing(true);
      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        tokenStorage.clearSession();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${http.defaults.baseURL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = data.accessToken;
        tokenStorage.setAccessToken(newAccessToken);
        if (data.refreshToken) {
          tokenStorage.setRefreshToken(data.refreshToken);
        }

        // Release queued requests
        refreshQueue.resolveQueue(newAccessToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return http(originalRequest);
      } catch (refreshErr) {
        refreshQueue.rejectQueue(refreshErr);
        tokenStorage.clearSession();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);
```

---

### 2. Vue Router Navigation Guard

```typescript
// src/app/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { tokenStorage } from '@/core/auth/auth-token';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/modules/auth/views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/',
      component: () => import('@/app/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        // Protected feature routes
      ],
    },
  ],
});

router.beforeEach((to, from, next) => {
  const isAuth = !tokenStorage.isTokenExpired();

  if (to.meta.requiresAuth && !isAuth) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }

  if (to.meta.guestOnly && isAuth) {
    return next({ path: '/' });
  }

  next();
});
```

---

## 🤖 Instructions for AI Agents

- Always use `tokenStorage` for session management; never use raw `localStorage.getItem('token')` across UI components.
- Always implement the `refreshQueue` pattern in HTTP client wrappers to avoid dropped sessions during parallel dashboard requests.
