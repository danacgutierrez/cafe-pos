import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useSesion } from '../contexto/SesionContext.tsx';
import { Campo } from '../../../compartido/componentes/Campo.tsx';
import { Cargando } from '../../../compartido/componentes/Cargando.tsx';
import { MensajeError } from '../../../compartido/componentes/MensajeError.tsx';
import { traerMisPuntos } from '../../recompensas/servicios/recompensas.ts';
import {
  erroresDelServicio,
  mensajeDeError,
  type ErroresCampo,
} from '../../../compartido/api/errores.ts';

export default function PaginaPerfil() {
  const { usuario, perfil, cargandoPerfil, actualizarPerfil, salir } = useSesion();
  const idClient = usuario?.idClient;
  const [puntos, setPuntos] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editando, setEditando] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errores, setErrores] = useState<ErroresCampo>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    if (!idClient) {
      setPuntos(null);
      setCargando(false);
      return;
    }
    try {
      const puntosDelCliente = await traerMisPuntos(idClient);
      setPuntos(puntosDelCliente.balance);
    } catch (e) {
      setPuntos(null);
      setError(mensajeDeError(e, 'No se pudieron cargar tus puntos.'));
    } finally {
      setCargando(false);
    }
  }, [idClient]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function empezarEdicion() {
    if (!perfil) return;
    setFirstName(perfil.firstName);
    setLastName(perfil.lastName);
    setPhoneNumber(perfil.phoneNumber);
    setErrores({});
    setErrorGeneral(null);
    setAviso(null);
    setEditando(true);
  }

  function cancelarEdicion() {
    setEditando(false);
    setErrores({});
    setErrorGeneral(null);
  }

  function validar(): ErroresCampo {
    const e: ErroresCampo = {};
    if (!firstName.trim()) e.firstName = 'Escribe tu nombre.';
    if (!lastName.trim()) e.lastName = 'Escribe tu apellido.';
    if (!phoneNumber.trim()) e.phoneNumber = 'Escribe tu teléfono.';
    else if (phoneNumber.trim().length > 20) {
      e.phoneNumber = 'El teléfono no puede tener más de 20 caracteres.';
    }
    return e;
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setAviso(null);
    setErrorGeneral(null);
    const locales = validar();
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    try {
      await actualizarPerfil({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      setEditando(false);
      setAviso('Tus datos se guardaron correctamente.');
    } catch (e) {
      const delServicio = erroresDelServicio(e, ['firstName', 'lastName', 'phoneNumber']);
      const mensaje = mensajeDeError(e, 'No se pudo guardar tu perfil.');
      // RN-51: el conflicto de teléfono llega como mensaje general.
      if (/tel[eé]fono/i.test(mensaje) && !delServicio.phoneNumber) {
        delServicio.phoneNumber = mensaje;
      }
      setErrores(delServicio);
      if (Object.keys(delServicio).length === 0) setErrorGeneral(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  function limpiar(campo: keyof ErroresCampo) {
    setErrores((actuales) => ({ ...actuales, [campo]: undefined }));
  }

  if (!usuario) return null;
  if (cargando || cargandoPerfil) return <Cargando />;
  if (error) return <MensajeError mensaje={error} onReintentar={() => void cargar()} />;

  const nombreMostrado = perfil
    ? `${perfil.firstName} ${perfil.lastName}`.trim()
    : usuario.correo.split('@')[0];

  return (
    <>
      <div className="pagina__encabezado">
        <h1>Mi perfil</h1>
        <p className="pagina__bajada">Tus datos y un atajo a lo que más usas.</p>
      </div>

      <div className="perfil">
        <section className="tarjeta-form">
          <div className="perfil__avatar" aria-hidden="true">
            {usuario.correo.charAt(0).toUpperCase()}
          </div>
          <h2>{nombreMostrado}</h2>
          <dl className="perfil__datos">
            <div><dt>Correo</dt><dd>{usuario.correo}</dd></div>
            <div><dt>Nombre</dt><dd>{perfil?.firstName ?? '—'}</dd></div>
            <div><dt>Apellido</dt><dd>{perfil?.lastName ?? '—'}</dd></div>
            <div><dt>Teléfono</dt><dd>{perfil?.phoneNumber ?? '—'}</dd></div>
            <div><dt>Rol</dt><dd>{usuario.rol === 'client' ? 'Cliente' : usuario.rol}</dd></div>
            <div><dt>ID de cliente</dt><dd>{usuario.idClient ?? 'Sin vincular'}</dd></div>
            <div>
              <dt>Puntos</dt>
              <dd className="numero">
                {puntos === null ? 'Aún no tienes puntos' : puntos}
              </dd>
            </div>
          </dl>

          {aviso && <p className="aviso aviso--exito">{aviso}</p>}

          {editando ? (
            <form className="perfil__formulario" onSubmit={guardar} noValidate>
              <h3>Editar mis datos</h3>
              {errorGeneral && <p className="aviso aviso--error">{errorGeneral}</p>}
              <div className="formulario__dos-columnas">
                <Campo etiqueta="Nombre" error={errores.firstName}>
                  <input className="campo__control" value={firstName} maxLength={100}
                    aria-invalid={Boolean(errores.firstName)}
                    onChange={(e) => { setFirstName(e.target.value); limpiar('firstName'); }} />
                </Campo>
                <Campo etiqueta="Apellido" error={errores.lastName}>
                  <input className="campo__control" value={lastName} maxLength={100}
                    aria-invalid={Boolean(errores.lastName)}
                    onChange={(e) => { setLastName(e.target.value); limpiar('lastName'); }} />
                </Campo>
              </div>
              <Campo etiqueta="Teléfono" error={errores.phoneNumber}>
                <input className="campo__control" type="tel" value={phoneNumber} maxLength={20}
                  aria-invalid={Boolean(errores.phoneNumber)}
                  onChange={(e) => { setPhoneNumber(e.target.value); limpiar('phoneNumber'); }} />
              </Campo>
              <div className="perfil__acciones">
                <button className="boton" type="submit" disabled={enviando}>
                  {enviando ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button className="boton boton--secundario" type="button" onClick={cancelarEdicion}
                  disabled={enviando}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="perfil__acciones">
              <button className="boton" onClick={empezarEdicion} disabled={!perfil}>
                Editar perfil
              </button>
              <button className="boton boton--secundario" onClick={salir}>Cerrar sesión</button>
            </div>
          )}
        </section>

        <aside className="resumen">
          <h2>Accesos rápidos</h2>
          <Link to="/pedidos" className="boton boton--ancho boton--secundario">Mis pedidos</Link>
          <Link to="/recompensas" className="boton boton--ancho boton--secundario">Mis recompensas</Link>
          <Link to="/menu" className="boton boton--ancho">Hacer un pedido</Link>
        </aside>
      </div>
    </>
  );
}
