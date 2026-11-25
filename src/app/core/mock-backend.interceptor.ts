import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { BANDEJA_DEMO, estadoDemo } from './mock-data';
import { EnviarMensajeRequest, LoginRequest } from './models';

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
