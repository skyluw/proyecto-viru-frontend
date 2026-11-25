import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from './models';
import { AuthService } from './auth.service';

/** Deja pasar solo si hay sesión y el rol coincide. Si no, manda al login o a su propio home. */
export function rolGuard(rol: Role): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const usuario = auth.usuario();
    if (!usuario || !auth.token) return router.parseUrl('/login');
    if (usuario.role !== rol) return router.parseUrl(auth.rutaInicio());
    return true;
  };
}

/** Para login y registro: si ya hay sesión, va directo a su home. */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.estaLogueado() ? inject(Router).parseUrl(auth.rutaInicio()) : true;
};
