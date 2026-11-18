import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// La URL del servicio se toma del entorno (VITE_API_URL). Si no se define,
// se usa el servidor local de desarrollo, pero ese valor vive aquí, en la
// configuración, no en el código de la aplicación.
export default defineConfig(({ mode }) => {
  const entorno = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react()],
    server: {
      port: 5173,
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(entorno.VITE_API_URL || 'http://localhost:3000'),
    },
  }
})
