export function MensajeError({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  return (
    <div className="error" role="alert">
      <p>{mensaje}</p>
      {onReintentar && <button className="boton" onClick={onReintentar}>Reintentar</button>}
    </div>
  );
}
