import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSesion } from '../contexto/SesionContext.tsx';
import { Campo } from '../../../compartido/componentes/Campo.tsx';
import { erroresDelServicio, mensajeDeError } from '../../../compartido/api/errores.ts';
import type { ErroresCampo } from '../../../compartido/api/errores.ts';

export default function PaginaRegistro() {
  const { registrar } = useSesion();
  const navegar = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState<ErroresCampo>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function validar(): ErroresCampo {
    const e: ErroresCampo = {};
    if (!firstName.trim()) e.firstName = 'Escribe tu nombre.';
    if (!lastName.trim()) e.lastName = 'Escribe tu apellido.';
    if (!phoneNumber.trim()) e.phoneNumber = 'Escribe tu teléfono.';
    else if (phoneNumber.trim().length > 20) e.phoneNumber = 'El teléfono no puede tener más de 20 caracteres.';
    if (!correo.trim()) e.correo = 'Escribe tu correo.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) e.correo = 'Escribe un correo válido.';
    if (!password) e.password = 'Escribe tu contraseña.';
    else if (password.length < 8) e.password = 'La contraseña debe tener al menos 8 caracteres.';
    return e;
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    const locales = validar();
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    try {
      await registrar({
        correo: correo.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      navegar('/menu', { replace: true });
    } catch (e) {
      const delServicio = erroresDelServicio(e, ['correo', 'password', 'firstName', 'lastName', 'phoneNumber']);
      const mensaje = mensajeDeError(e, 'No se pudo crear la cuenta.');
      // Los conflictos (correo/teléfono ya usados) también van junto al campo.
      if (/correo/i.test(mensaje) && !delServicio.correo) delServicio.correo = mensaje;
      if (/tel[eé]fono/i.test(mensaje) && !delServicio.phoneNumber) delServicio.phoneNumber = mensaje;
      setErrores(delServicio);
      if (Object.keys(delServicio).length === 0) setErrorGeneral(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  function limpiar(campo: keyof ErroresCampo) {
    setErrores((actuales) => ({ ...actuales, [campo]: undefined }));
  }

  return (
    <div className="autenticacion">
      <form className="formulario" onSubmit={enviar} noValidate>
        <p className="formulario__marca">☕ Cafepos</p>
        <h1>Crea tu cuenta</h1>
        <p className="formulario__bajada">Empieza a juntar puntos desde tu primer pedido.</p>
        {errorGeneral && <p className="aviso aviso--error">{errorGeneral}</p>}

        <div className="formulario__dos-columnas">
          <Campo etiqueta="Nombre" error={errores.firstName}>
            <input className="campo__control" value={firstName} aria-invalid={Boolean(errores.firstName)}
              onChange={(e) => { setFirstName(e.target.value); limpiar('firstName'); }} />
          </Campo>
          <Campo etiqueta="Apellido" error={errores.lastName}>
            <input className="campo__control" value={lastName} aria-invalid={Boolean(errores.lastName)}
              onChange={(e) => { setLastName(e.target.value); limpiar('lastName'); }} />
          </Campo>
        </div>

        <Campo etiqueta="Teléfono" error={errores.phoneNumber}>
          <input className="campo__control" type="tel" value={phoneNumber} maxLength={20}
            aria-invalid={Boolean(errores.phoneNumber)}
            onChange={(e) => { setPhoneNumber(e.target.value); limpiar('phoneNumber'); }} />
        </Campo>

        <Campo etiqueta="Correo" error={errores.correo}>
          <input className="campo__control" type="email" autoComplete="email" value={correo}
            aria-invalid={Boolean(errores.correo)}
            onChange={(e) => { setCorreo(e.target.value); limpiar('correo'); }} />
        </Campo>

        <Campo etiqueta="Contraseña (8 caracteres o más)" error={errores.password}>
          <input className="campo__control" type="password" autoComplete="new-password" value={password}
            aria-invalid={Boolean(errores.password)}
            onChange={(e) => { setPassword(e.target.value); limpiar('password'); }} />
        </Campo>

        <button className="boton boton--ancho" type="submit" disabled={enviando}>
          {enviando ? 'Creando…' : 'Crear cuenta'}
        </button>
        <p className="formulario__pie">¿Ya tienes cuenta? <Link to="/entrar">Entra</Link></p>
      </form>
    </div>
  );
}
