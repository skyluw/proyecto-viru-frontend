import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { BANDEJA_DEMO, DISPOSITIVOS_DEMO, estadoDemo } from './mock-data';
import { AsignacionPredio, EnviarMensajeRequest, LoginRequest, Predio } from './models';

const JUNTAS_DEMO = ['Huacapongo', 'Choloque', 'Queneto'].map((nombre, i) => ({
  id: i + 1, nombre, regionId: 1,
}));
const CANALES_DEMO = DISPOSITIVOS_DEMO.filter((d) => d.tipo === 'CAUDALIMETRO_CANAL').map((d) => ({
  id: d.id, codigo: d.codigo, nombre: d.nombreCanal ?? d.codigo,
}));
const PREDIOS_DEMO: Predio[] = [
  { id: 1, codigo: 'DEMO-01', nombre: 'Predio de muestra', agricultorId: 2, canales: [CANALES_DEMO[5]] },
];

/**
 * Solo actúa en modo demo (environment.useMock = true). Responde las llamadas /api
 * con datos simulados, imitando al backend real, para poder mostrar la web sin Spring Boot.
 * Login demo: un correo que contenga "admin" entra como ADMIN; cualquier otro, como FARMER.
 */
export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMock || !req.url.includes('/api/')) return next(req);

  const ok = <T>(body: T, status = 200) => of(new HttpResponse({ status, body })).pipe(delay(350));
  const url = req.url;

  if (url.endsWith('/api/users/login')) {
    const { correo, password } = req.body as LoginRequest;
    if (password.length < 3) {
      return throwError(
        () => new HttpErrorResponse({ status: 401, error: { error: 'Credenciales inválidas' } }),
      ).pipe(delay(350));
    }
    const esAdmin = correo.toLowerCase().includes('admin');
    return ok({
      token: 'token-demo',
      tokenType: 'Bearer',
      expiresInSeconds: 4 * 3600,
      user: {
        id: esAdmin ? 1 : 2,
        nombre: esAdmin ? 'Administrador' : 'Agricultor demo',
        correo,
        role: esAdmin ? 'ADMIN' : 'FARMER',
      },
    });
  }

  if (url.includes('/api/users/register/')) {
    const body = req.body as { nombre: string; correo: string };
    const role = url.endsWith('/admin') ? 'ADMIN' : 'FARMER';
    return ok({ id: Math.floor(Math.random() * 1000), nombre: body.nombre, correo: body.correo, role }, 201);
  }

  if (url.endsWith('/api/admin/dispositivos/estado')) return ok(estadoDemo());

  if (url.endsWith('/api/catalogo/riego')) {
    return ok({ regiones: [{ id: 1, nombre: 'Virú' }], juntas: JUNTAS_DEMO });
  }
  if (/\/api\/admin\/dispositivos\/\d+\/historial$/.test(url)) return ok([]);
  if (url.endsWith('/api/admin/predios')) {
    return ok({
      agricultores: [{ id: 2, nombre: 'Agricultor demo', correo: 'agricultor@viru.test', junta: 'Huacapongo' }],
      canales: CANALES_DEMO, predios: PREDIOS_DEMO,
    });
  }
  if (url.includes('/api/admin/predios/') && req.method === 'PUT') {
    const datos = req.body as AsignacionPredio;
    const codigo = decodeURIComponent(url.split('/').at(-1)!);
    const indice = PREDIOS_DEMO.findIndex((p) => p.codigo === codigo);
    const predio = {
      id: indice < 0 ? PREDIOS_DEMO.length + 1 : PREDIOS_DEMO[indice].id,
      codigo,
      nombre: datos.nombre,
      agricultorId: datos.agricultorId,
      canales: CANALES_DEMO.filter((c) => datos.canalIds.includes(c.id)),
    };
    if (indice < 0) PREDIOS_DEMO.push(predio);
    else PREDIOS_DEMO[indice] = predio;
    return ok(null, 204);
  }
  if (url.endsWith('/api/farmer/predios')) {
    const ids = PREDIOS_DEMO.flatMap((p) => p.canales.map((c) => c.id));
    const lista = estadoDemo();
    const vecinos = new Set(['CAN-05', 'CAN-09', 'CAN-19']);
    return ok({
      predios: PREDIOS_DEMO,
      canales: lista.filter((d) => ids.includes(d.dispositivoId)),
      comision: 'Huacapongo',
      canalesComision: lista
        .filter((d) => ids.includes(d.dispositivoId) || vecinos.has(d.codigo))
        .map((d) => ({ ...d, propio: ids.includes(d.dispositivoId) })),
    });
  }

  if (url.endsWith('/api/admin/mensajes') && req.method === 'POST') {
    const body = req.body as EnviarMensajeRequest;
    return ok(
      {
        id: Math.floor(Math.random() * 1000),
        tipo: body.tipo,
        alcance: body.alcance,
        destinatarios: body.alcance === 'REGION' ? 42 : 17,
        creadoEn: new Date().toISOString(),
      },
      201,
    );
  }

  if (url.endsWith('/api/farmer/mensajes')) {
    const solo = req.params.get('soloNoLeidos') === 'true';
    return ok(BANDEJA_DEMO.filter((n) => !solo || !n.leido));
  }

  const leido = url.match(/\/api\/farmer\/mensajes\/(\d+)\/leido$/);
  if (leido) {
    const n = BANDEJA_DEMO.find((x) => x.id === Number(leido[1]));
    if (n) n.leido = true;
    return ok(null, 204);
  }

  return throwError(() => new HttpErrorResponse({ status: 404, url })).pipe(delay(200));
};
