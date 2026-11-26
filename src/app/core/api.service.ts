import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CatalogoRiego } from './catalogos';
import {
  AsignacionPredio,
  DispositivoEstado,
  EnviarMensajeRequest,
  MensajeEnviado,
  MisPredios,
  Muestra,
  Notificacion,
  PanelPredios,
} from './models';

/** Todas las llamadas REST a la capa de aplicación (Spring Boot), menos autenticación. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  catalogoRiego(): Observable<CatalogoRiego> {
    return this.http.get<CatalogoRiego>(`${this.base}/catalogo/riego`);
  }

  // ---- Administrador ----
  estadoDispositivos(): Observable<DispositivoEstado[]> {
    return this.http.get<DispositivoEstado[]>(`${this.base}/admin/dispositivos/estado`);
  }

  historial(dispositivoId: number): Observable<Muestra[]> {
    return this.http.get<Muestra[]>(`${this.base}/admin/dispositivos/${dispositivoId}/historial`);
  }

  panelPredios(): Observable<PanelPredios> {
    return this.http.get<PanelPredios>(`${this.base}/admin/predios`);
  }

  guardarPredio(codigo: string, datos: AsignacionPredio): Observable<void> {
    return this.http.put<void>(`${this.base}/admin/predios/${encodeURIComponent(codigo)}`, datos);
  }

  enviarMensaje(datos: EnviarMensajeRequest): Observable<MensajeEnviado> {
    return this.http.post<MensajeEnviado>(`${this.base}/admin/mensajes`, datos);
  }

  // ---- Agricultor ----
  misPredios(): Observable<MisPredios> {
    return this.http.get<MisPredios>(`${this.base}/farmer/predios`);
  }

  bandeja(soloNoLeidos = false, limite = 50): Observable<Notificacion[]> {
    const params = new HttpParams().set('soloNoLeidos', soloNoLeidos).set('limite', limite);
    return this.http.get<Notificacion[]>(`${this.base}/farmer/mensajes`, { params });
  }

  marcarLeido(entregaId: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/farmer/mensajes/${entregaId}/leido`, null);
  }
}
