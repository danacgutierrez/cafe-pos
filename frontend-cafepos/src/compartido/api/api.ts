// compartido/api/api.ts — ÚNICO punto de comunicación con el servicio.
// Aquí se configuran la URL, el token, el sobre { data, meta } y los 401.
// Ninguna otra capa importa axios ni conoce la forma de la respuesta.
import axios from 'axios';

// La dirección viene del entorno (VITE_API_URL). El valor por defecto se define
// en vite.config.ts, así que no está escrito en el código de la aplicación.
export const URL_API: string = import.meta.env.VITE_API_URL;

// Eventos globales de conectividad. El 401 sigue usando 'sesion-terminada';
// estos sólo avisan de que el servicio dejó de responder (o volvió a hacerlo).
export const EVENTO_BACKEND_CAIDO = 'backend-caido';
export const EVENTO_BACKEND_ACTIVO = 'backend-activo';

export const api = axios.create({
  baseURL: URL_API,
  timeout: 8000,
});

// Formato uniforme del avance 2. El tipo se declara una sola vez aquí.
export interface Sobre<T> {
  data: T;
  meta: {
    ruta: string;
    duracionMs: number;
    timestamp: string;
  };
}

function esSobre(valor: unknown): valor is Sobre<unknown> {
  if (typeof valor !== 'object' || valor === null) return false;
  const cuerpo = valor as { data?: unknown; meta?: unknown };
  return 'data' in cuerpo && 'meta' in cuerpo;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (respuesta) => {
    window.dispatchEvent(new Event(EVENTO_BACKEND_ACTIVO));
    // El sobre se interpreta AQUÍ, una sola vez. Los servicios reciben el DTO.
    if (esSobre(respuesta.data)) respuesta.data = respuesta.data.data;
    return respuesta;
  },
  (error) => {
    // Sin respuesta (ERR_NETWORK/timeout) el backend está caído: lo avisamos
    // para que cualquier pantalla muestre el estado de reintento.
    if (axios.isAxiosError(error) && !error.response) {
      window.dispatchEvent(new Event(EVENTO_BACKEND_CAIDO));
    }
    // Un 401 del login son credenciales incorrectas, no una sesión expirada.
    const esLogin = axios.isAxiosError(error)
      && ['/auth/login', '/auth/registro'].includes(error.config?.url ?? '');
    if (axios.isAxiosError(error) && error.response?.status === 401 && !esLogin && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.dispatchEvent(new Event('sesion-terminada'));
    }
    return Promise.reject(error);
  },
);
