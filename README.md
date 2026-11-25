# Riego Virú · Frontend (capa de presentación)

Web en **Angular 20 + Angular Material + Chart.js** para el sistema de monitoreo hídrico de
Huacapongo, Choloque y Queneto. Consume la API de Spring Boot de
[`proyecto-viru-services`](https://github.com/msmlolman/proyecto-viru-services).

## Cómo correrlo

Requisitos: Node.js 20 o superior.

```bash
npm install

# Modo demo: datos simulados, NO necesita el backend (para mostrar la web en clase)
npm run start:demo        # abre http://localhost:4200

# Modo normal: conectado al backend en http://localhost:8080
npm start
```

En modo demo, un correo que contenga `admin` (ej. `admin@viru.pe`) entra como administrador;
cualquier otro correo entra como agricultor. La contraseña puede ser cualquiera.

En modo normal, `proxy.conf.json` reenvía `/api` a `localhost:8080`, por eso no hace falta
configurar CORS en Spring Boot. Si el backend corre en otra máquina (Azure), cambia el `target`.

## Pantallas

| Ruta | Quién | Qué hace | Endpoints |
|---|---|---|---|
| `/login` | Todos | Inicia sesión y guarda el JWT | `POST /api/users/login` |
| `/registro` | Todos | Crea cuenta de agricultor (con junta) o de administrador (con código) | `POST /api/users/register/farmer`, `/register/admin` |
| `/admin` | ADMIN | Estado de los 24 dispositivos, lecturas en vivo, gráfico y envío de avisos | `GET /api/admin/dispositivos/estado`, `GET /api/admin/stream`, `POST /api/admin/mensajes` |
| `/agricultor` | FARMER | Bandeja de avisos, próximo riego y marcar como leído | `GET /api/farmer/mensajes`, `PATCH /api/farmer/mensajes/{id}/leido` |

Actualización de datos:
- **Administrador:** recibe las lecturas al instante por SSE (`/api/admin/stream`) y además
  recarga el estado completo cada 60 s.
- **Agricultor:** consulta su bandeja cada 30 s.

## Estructura

```
src/app/
  core/
    models.ts                 Interfaces = DTOs del backend
    catalogos.ts              Juntas, regiones y textos de los enums
    auth.service.ts           Login, registro, logout, guarda el JWT
    auth.interceptor.ts       Pone "Authorization: Bearer" y traduce errores
    guards.ts                 Protege /admin y /agricultor según el rol
    api.service.ts            Llamadas REST
    live-stream.service.ts    Lee el SSE con fetch (EventSource no envía el token)
    mock-backend.interceptor.ts + mock-data.ts   Solo para el modo demo
  shared/                     Barra superior, gráfico (Chart.js) y formatos
  pages/                      login, registro, admin (+ diálogo de aviso), agricultor
deploy/nginx.conf             Servidor WEB con HTTPS y proxy /api -> APP
```

## Publicar en Nginx (servidor WEB)

```bash
npm run build                                    # genera dist/viru-frontend/browser
scp -r dist/viru-frontend/browser/* usuario@WEB_IP:/var/www/viru-frontend/
# copiar deploy/nginx.conf a /etc/nginx/conf.d/viru.conf, poner la IP de APP y los certificados
sudo nginx -t && sudo systemctl reload nginx
```

Así el navegador solo habla con **WEB (443)**; Nginx reenvía `/api` a **APP (8080)** y solo APP
se conecta a **DATOS (5432)**.

## Pendientes con backend

1. **Listar juntas y regiones.** El registro de agricultor pide `juntaReganteId`, pero no hay
   endpoint para listarlas. Por ahora están fijas en `core/catalogos.ts` (ids 1–3).
   Confirmar con `SELECT id, nombre, region_id FROM junta_regante;` o agregar `GET /api/juntas`.
2. **Historial.** El gráfico muestra solo lo recibido desde que se abrió el panel; no existe
   un endpoint de lecturas históricas por dispositivo.
3. **Errores de validación.** Para mostrar el detalle por campo de los errores 400, agregar en
   `application.properties`: `server.error.include-binding-errors=always`.
