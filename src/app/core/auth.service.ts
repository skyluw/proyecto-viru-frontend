import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  SignUpAdminRequest,
  SignUpFarmerRequest,
  UserResponse,
} from './models';

const STORAGE_KEY = 'viru.sesion';

interface SesionGuardada {
  token: string;
  expiraEn: number; // milisegundos (Date.now())
  user: UserResponse;
}

/**
 * Maneja la sesión: login, registro y logout.
 * El backend es stateless (JWT): guardamos el token en localStorage y el interceptor
 * lo envía en cada petición como "Authorization: Bearer <token>".
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private api = `${environment.apiUrl}/api/users`;

  private sesion = signal<SesionGuardada | null>(this.leerSesion());

  readonly usuario = computed(() => this.sesion()?.user ?? null);
  readonly estaLogueado = computed(() => this.sesion() !== null);

  get token(): string | null {
    const s = this.sesion();
    if (!s) return null;
    if (Date.now() >= s.expiraEn) {
      this.logout();
      return null;
    }
    return s.token;
  }

  login(datos: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/login`, datos).pipe(
      tap((resp) => {
        const sesion: SesionGuardada = {
          token: resp.token,
          expiraEn: Date.now() + resp.expiresInSeconds * 1000,
          user: resp.user,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
        this.sesion.set(sesion);
      }),
    );
  }

  registrarAgricultor(datos: SignUpFarmerRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.api}/register/farmer`, datos);
  }

  registrarAdmin(datos: SignUpAdminRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.api}/register/admin`, datos);
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.sesion.set(null);
    this.router.navigate(['/login']);
  }

  /** Ruta de inicio según el rol que devolvió el backend. */
  rutaInicio(): string {
    return this.usuario()?.role === 'ADMIN' ? '/admin' : '/agricultor';
  }

  private leerSesion(): SesionGuardada | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as SesionGuardada;
      return Date.now() < s.expiraEn ? s : null;
    } catch {
      return null;
    }
  }
}
