/**
 * ⚡ DEVFORGE API Error Normalizer
 * Extracts consistent, user-friendly localized error messages and field validation maps
 * from Axios, Fetch, Laravel, Express, NestJS, FastAPI, and Django error responses.
 */

export interface NormalizedError {
  message: string;
  status: number;
  fieldErrors: Record<string, string>;
  original: unknown;
}

export function normalizeApiError(error: unknown, fallbackMessage = 'Ocurrió un error inesperado al procesar la solicitud.'): NormalizedError {
  let status = 500;
  let message = fallbackMessage;
  const fieldErrors: Record<string, string> = {};

  if (!error) {
    return { message, status, fieldErrors, original: error };
  }

  // Handle Axios / Fetch response-like objects
  const err = error as Record<string, any>;
  const response = err.response || err;

  if (response?.status && typeof response.status === 'number') {
    status = response.status;
  }

  const data = response?.data || response;

  // 1. Status specific default messages
  if (status === 401) {
    message = 'Sesión expirada o credenciales inválidas. Por favor, inicia sesión nuevamente.';
  } else if (status === 403) {
    message = 'No tienes permisos suficientes para realizar esta acción.';
  } else if (status === 404) {
    message = 'El recurso solicitado no fue encontrado o no está disponible.';
  } else if (status === 500) {
    message = 'Error interno en el servidor. Por favor, intenta más tarde o contacta al administrador.';
  }

  // 2. Extract backend custom messages if available
  if (typeof data === 'string' && data.trim()) {
    message = data;
  } else if (data && typeof data === 'object') {
    // Laravel / NestJS standard: { message: "..." }
    if (typeof data.message === 'string' && data.message.trim()) {
      message = data.message;
    } else if (typeof data.error === 'string' && data.error.trim()) {
      message = data.error;
    } else if (typeof data.detail === 'string' && data.detail.trim()) {
      // FastAPI / Django standard: { detail: "..." }
      message = data.detail;
    }

    // 3. Extract Field Validation Errors
    // Laravel: { errors: { email: ["El correo ya existe"] } }
    if (data.errors && typeof data.errors === 'object') {
      for (const [field, errorList] of Object.entries(data.errors)) {
        if (Array.isArray(errorList) && errorList.length > 0) {
          fieldErrors[field] = String(errorList[0]);
        } else if (typeof errorList === 'string') {
          fieldErrors[field] = errorList;
        }
      }
    }

    // FastAPI: { detail: [{ loc: ["body", "email"], msg: "..." }] }
    if (Array.isArray(data.detail)) {
      for (const item of data.detail) {
        if (item.loc && Array.isArray(item.loc) && item.msg) {
          const fieldName = String(item.loc[item.loc.length - 1]);
          fieldErrors[fieldName] = String(item.msg);
        }
      }
    }
  }

  // Fallback to error.message (e.g. Network Error / timeout)
  if (err.message && (!message || message === fallbackMessage)) {
    if (err.message.includes('Network Error')) {
      message = 'Error de conexión. Verifica tu acceso a internet o el estado del servidor.';
    } else {
      message = err.message;
    }
  }

  return {
    message,
    status,
    fieldErrors,
    original: error,
  };
}
