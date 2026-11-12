# TaskFlow · Gestor de Tareas

Aplicación web para organizar tareas diarias con tablero Kanban, construida con **React 19 + Vite + Tailwind CSS**.

## Funcionalidades

- Registro e inicio de sesión (con cuenta demo: `demo@taskflow.app` / `password123`)
- CRUD de tareas: título, descripción, fecha de vencimiento, prioridad y estado
- Tablero Kanban con **arrastrar y soltar** entre columnas, o vista de lista
- Búsqueda y filtros por estado y prioridad
- Métricas animadas, anillo de progreso y contador de tareas vencidas
- Notificaciones, confeti al completar tareas y atajos de teclado (`N` nueva tarea, `Esc` cerrar)

> Los datos se guardan en el `localStorage` del navegador: cada navegador/dispositivo tiene sus propios usuarios y tareas.

## Desarrollo local

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera /dist
npm run preview  # sirve /dist localmente
```

## Despliegue en Render

Sitio estático (ver `render.yaml`):

- **Build command:** `npm ci && npm run build`
- **Publish directory:** `dist`
- **Node:** 22 (`.node-version` / variable `NODE_VERSION`)
