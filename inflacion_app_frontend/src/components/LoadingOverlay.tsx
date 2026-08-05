import { memo } from 'react';

interface LoadingOverlayProps {
    message?: string;
}

// Los tres call sites escriben el mensaje con "..." al final; acá se recortan
// porque los puntos los pone (y anima) el overlay.
const stripEllipsis = (message: string) => message.replace(/[.…]+\s*$/, '');

/*
 * Sin tarjeta, sin borde y sin spinner: solo el mensaje sobre la app
 * oscurecida. Un overlay de carga no es contenido -- enmarcarlo en un panel
 * con sombra lo convierte en una pantalla más, cuando lo único que tiene que
 * decir es "esperá". Los tres puntos son el único movimiento (.nc-dot-2 /
 * .nc-dot-3 en nocturne.css); el resto queda quieto a propósito.
 */
const LoadingOverlay = memo(({ message = 'Guardando...' }: LoadingOverlayProps) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9998] px-6" role="status" aria-live="polite">
      <p className="text-ink text-lg font-medium text-center">
        {stripEllipsis(message)}
        {/* Oculto para lectores de pantalla: el aria-live ya anuncia el
            mensaje, y los puntos animados lo reanunciarían en loop. */}
        <span aria-hidden="true">
          <span>.</span>
          <span className="nc-dot-2">.</span>
          <span className="nc-dot-3">.</span>
        </span>
      </p>
    </div>
  );
});

LoadingOverlay.displayName = 'LoadingOverlay';

export default LoadingOverlay;
