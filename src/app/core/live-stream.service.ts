import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { LecturaEnVivo } from './models';
import { generarLecturaDemo } from './mock-data';

/**
 * Lecturas en tiempo real: GET /api/admin/stream (Server-Sent Events).
 *
 * El EventSource del navegador no permite enviar el header Authorization (ver MONITORING.md),
 * así que leemos el stream con fetch() y separamos los eventos a mano:
 *   event: lectura
 *   data: {...json...}
 *   (línea en blanco)
 * Si la conexión se corta, se vuelve a conectar a los 5 segundos.
 */
@Injectable({ providedIn: 'root' })
export class LiveStreamService {
  private auth = inject(AuthService);

  lecturas(): Observable<LecturaEnVivo> {
    if (environment.useMock) return this.lecturasDemo();

    return new Observable<LecturaEnVivo>((subscriber) => {
      let controller: AbortController | null = null;
      let reintento: ReturnType<typeof setTimeout> | null = null;
      let cerrado = false;

      const conectar = async () => {
        controller = new AbortController();
        try {
          const resp = await fetch(`${environment.apiUrl}/api/admin/stream`, {
            headers: { Authorization: `Bearer ${this.auth.token}`, Accept: 'text/event-stream' },
            signal: controller.signal,
          });
          if (resp.status === 401) {
            this.auth.logout();
            return;
          }
          if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
            let fin: number;
            while ((fin = buffer.indexOf('\n\n')) >= 0) {
              const bloque = buffer.slice(0, fin);
              buffer = buffer.slice(fin + 2);
              const evento = this.parsearEvento(bloque);
              if (evento) subscriber.next(evento);
            }
          }
        } catch {
          // conexión cortada o servidor caído: se reintenta abajo
        }
        if (!cerrado) reintento = setTimeout(conectar, 5000);
      };

      conectar();
      return () => {
        cerrado = true;
        controller?.abort();
        if (reintento) clearTimeout(reintento);
      };
    });
  }

  private parsearEvento(bloque: string): LecturaEnVivo | null {
    let nombre = 'message';
    const datos: string[] = [];
    for (const linea of bloque.split('\n')) {
      if (linea.startsWith(':')) continue; // comentario "keepalive" del heartbeat
      if (linea.startsWith('event:')) nombre = linea.slice(6).trim();
      else if (linea.startsWith('data:')) datos.push(linea.slice(5).trim());
    }
    if (nombre !== 'lectura' || datos.length === 0) return null;
    try {
      return JSON.parse(datos.join('\n')) as LecturaEnVivo;
    } catch {
      return null;
    }
  }

  /** Modo demo: una lectura simulada cada 3 segundos. */
  private lecturasDemo(): Observable<LecturaEnVivo> {
    return new Observable<LecturaEnVivo>((subscriber) => {
      const id = setInterval(() => subscriber.next(generarLecturaDemo()), 3000);
      return () => clearInterval(id);
    });
  }
}
