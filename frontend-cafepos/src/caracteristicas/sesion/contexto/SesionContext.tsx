// La sesión se comparte por contexto; el carrito y el catálogo viven en Zustand.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import * as servicio from '../servicios/sesion.ts';
import { useCarrito } from '../../carrito/estado/carrito.ts';
import type { DatosRegistro } from '../servicios/sesion.ts';
import type {
  PayloadJwt,
  Sesion,
  DatosPerfil,
  ActualizarPerfilDto,
} from '../../../compartido/api/tipos.ts';

interface ValorSesion {
  usuario: PayloadJwt | null;
  // El perfil no está en el JWT: se consulta a /clients/me. Vive aquí para que
  // el saludo del Encabezado y la página de perfil vean el mismo dato.
  perfil: DatosPerfil | null;
  cargandoPerfil: boolean;
  entrar: (correo: string, password: string) => Promise<void>;
  registrar: (datos: DatosRegistro) => Promise<void>;
  actualizarPerfil: (datos: ActualizarPerfilDto) => Promise<DatosPerfil>;
  salir: () => void;
  aviso: string | null;
  descartarAviso: () => void;
}

const SesionContext = createContext<ValorSesion | null>(null);

function leerUsuario(): PayloadJwt | null {
  const guardado = localStorage.getItem('usuario');
  if (!guardado) return null;
  try {
    return JSON.parse(guardado) as PayloadJwt;
  } catch {
    return null;
  }
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const navegar = useNavigate();
  const [usuario, setUsuario] = useState<PayloadJwt | null>(leerUsuario);
  const [perfil, setPerfil] = useState<DatosPerfil | null>(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargarPerfil = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setPerfil(null);
      setCargandoPerfil(false);
      return;
    }
    setCargandoPerfil(true);
    try {
      setPerfil(await servicio.traerPerfil());
    } catch {
      // Sin perfil el saludo cae al correo; la sesión sigue siendo válida.
      setPerfil(null);
    } finally {
      setCargandoPerfil(false);
    }
  }, []);

  async function guardar(sesion: Sesion) {
    localStorage.setItem('token', sesion.token);
    localStorage.setItem('usuario', JSON.stringify(sesion.usuario));
    setAviso(null);
    setUsuario(sesion.usuario);
    await cargarPerfil();
  }

  async function entrar(correo: string, password: string) {
    await guardar(await servicio.entrar(correo, password));
  }

  async function registrar(datos: DatosRegistro) {
    await guardar(await servicio.registrar(datos));
  }

  async function actualizarPerfil(datos: ActualizarPerfilDto): Promise<DatosPerfil> {
    const actualizado = await servicio.actualizarPerfil(datos);
    setPerfil(actualizado);
    return actualizado;
  }

  function salir() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    // El carrito es del cliente que está entrando: se vacía al cerrar sesión.
    useCarrito.getState().vaciar();
    setAviso(null);
    setUsuario(null);
    setPerfil(null);
    setCargandoPerfil(false);
    navegar('/entrar', { replace: true });
  }

  useEffect(() => {
    // Con token guardado se intenta siempre: si el JWT no trae idClient,
    // cargarPerfil() falla en silencio y deja de mostrar el spinner.
    if (localStorage.getItem('token')) void cargarPerfil();
  }, [cargarPerfil]);

  useEffect(() => {
    // El interceptor de Axios avisa cuando el servicio dice que el token ya no vale.
    const alTerminar = () => {
      setUsuario(null);
      setPerfil(null);
      setAviso('Tu sesión terminó. Vuelve a entrar.');
    };
    window.addEventListener('sesion-terminada', alTerminar);
    return () => window.removeEventListener('sesion-terminada', alTerminar);
  }, []);

  return (
    <SesionContext value={{
      usuario,
      perfil,
      cargandoPerfil,
      entrar,
      registrar,
      actualizarPerfil,
      salir,
      aviso,
      descartarAviso: () => setAviso(null),
    }}>
      {children}
    </SesionContext>
  );
}

export function useSesion() {
  const valor = useContext(SesionContext);
  if (!valor) throw new Error('useSesion() tiene que usarse dentro de <ProveedorSesion>');
  return valor;
}
