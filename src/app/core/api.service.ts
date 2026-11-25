import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DispositivoEstado, EnviarMensajeRequest, MensajeEnviado, Notificacion } from './models';

/** Todas las llamadas REST a la capa de aplicación (Spring Boot), menos autenticación. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  // ---- Administrador ----
  estadoDispositivos(): Observable<DispositivoEstado[]> {
    return this.http.get<DispositivoEstado[]>(`${this.base}/admin/dispositivos/estado`);
  }

  enviarMensaje(datos: EnviarMensajeRequest): Observable<MensajeEnviado> {
    return this.http.post<MensajeEnviado>(`${this.base}/admin/mensajes`, datos);
  }

  // ---- Agricultor ----
  bandeja(soloNoLeidos = false, limite = 50): Observable<Notificacion[]> {
    const params = new HttpParams().set('soloNoLeidos', soloNoLeidos).set('limite', limite);
    return this.http.get<Notificacion[]>(`${this.base}/farmer/mensajes`, { params });
  }

  marcarLeido(entregaId: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/farmer/mensajes/${entregaId}/leido`, null);
  }
}
