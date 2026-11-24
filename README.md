BACKEND:



Es necesario tener instalado MySQL80 pues es la base de datos que se utiliza. También
VSCode, ya que es el editor en el cual está la extensión CLIENT Rest para las pruebas.

1.- Entrar dentro de la raíz "backend-cafepos"

2.- Ejecutar el comando: npm install

3.- Cambiar el nombre del archivo ".env.ejemplo" a ".env" y cambiar la palabra "contraseña"

&#x20;   por la contraseña de la base de datos MySQL

3.- Ejecutar el comando: npx prisma generate

4.- Ejecutar el comando: npx prisma db seed

5.- Ejecutar el comando: npm run start:dev

6.- Instalar o tener instalada la extensión REST Client de VSCode para poder ejecutar

&#x20;   las peticiones HTTP del archivo "peticiones.http"



FRONTEND:

1. Entrar en la carpeta `frontend-cafepos`.

2. Instalar las dependencias:

   npm ci

3. Copiar el archivo `.env.example` como `.env`.

   En PowerShell:

   Copy-Item .env.example .env

4. Configurar `VITE_API_URL` con la URL del backend.
   Para desarrollo local:

   VITE_API_URL=http://localhost:3000

   Si no se define esta variable, Vite utiliza
   http://localhost:3000 como valor predeterminado.

5. Verificar que el backend se encuentre en ejecución.

6. Iniciar el frontend:

   npm run dev

7. Abrir http://localhost:5173/ en el navegador.

### Verificaciones del frontend

Compilar el proyecto:

    npm run build

Revisar la calidad del código:

    npm run lint

Ejecutar las pruebas automatizadas (Node.js 24):

    node --test tests/errores.test.mjs

Los archivos `.env` locales no deben subirse al repositorio.
El archivo `.env.example` sirve como plantilla de configuración.
