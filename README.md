# Menu Lungo

App Next.js para restaurante con pedidos en mesa y panel de cocina en tiempo real.

## Funcionalidades
- Cliente: menú por categorías, carrito y envío de pedidos.
- Cocina: panel en tiempo real con estados (nuevo, preparando, listo).
- Login de cocina con Supabase Auth (email/password).

## Requisitos
- Cuenta de Supabase (gratuita).
- Node.js 18+.

## Configuración local
1) Instala dependencias:
```
npm install
```

2) Crea `.env.local` en la raíz con:
```
NEXT_PUBLIC_SUPABASE_URL=... 
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

3) En Supabase, ejecuta el SQL de `supabase/schema.sql`.

4) En Supabase Auth, habilita Email/Password y crea un usuario para cocina.

5) Ejecuta la app:
```
npm run dev
```

## Producción (Vercel)
- Agrega las mismas variables de entorno en Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Despliega el repo.

## Rutas
- `/` cliente
- `/admin` cocina (protegido)
- `/login` login cocina
- `/menu.pdf` carta completa (referencia)

## Notas
- La inserción de pedidos permite usuarios anónimos.
- El panel de cocina requiere login.
