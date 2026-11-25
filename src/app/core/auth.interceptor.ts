import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Agrega el JWT a todas las peticiones /api (menos login y registro, que son públicas).
 * Si el backend responde 401 (token vencido o inválido) cierra la sesión.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const esPublica = req.url.includes('/api/users/');
  const token = esPublica ? null : auth.token;

  const peticion = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(peticion).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !esPublica) auth.logout();
      return throwError(() => err);
    }),
  );
};

/** Convierte los errores del backend en un texto para mostrar al usuario. */
export function mensajeDeError(err: unknown): string {
  if (!(err instanceof HttpErrorResponse)) return 'Ocurrió un error inesperado.';
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  const body = err.error;
  // GlobalExceptionHandler responde {"error": "..."}
  if (body?.error && typeof body.error === 'string' && err.status !== 400) return body.error;
  if (err.status === 400) {
    // Errores de @Valid: Spring devuelve "errors" con el detalle por campo
    const detalle = body?.errors?.map?.((e: { defaultMessage?: string }) => e.defaultMessage);
    if (detalle?.length) return detalle.join(' · ');
    if (typeof body?.error === 'string' && body.error !== 'Bad Request') return body.error;
    return 'Revisa los datos ingresados.';
  }
  if (err.status === 401) return 'Credenciales inválidas.';
  if (err.status === 403) return 'No tienes permiso para esta acción.';
  if (err.status === 409) return 'El correo ya está registrado o hay un conflicto con los datos.';
  return `Error del servidor (${err.status}).`;
}
