import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Subject, interval, merge, startWith, switchMap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { mensajeDeError } from '../../core/auth.interceptor';
import { AuthService } from '../../core/auth.service';
import { TIPO_MENSAJE_ICONO, TIPO_MENSAJE_LABEL } from '../../core/catalogos';
import { Notificacion } from '../../core/models';
import { BarraSuperior } from '../../shared/barra-superior';
import { haceCuanto } from '../../shared/formato';

const REFRESCO_MS = 30_000; // el cliente consulta su bandeja cada 30 s

/**
 * Home del agricultor: su bandeja de avisos (GET /api/farmer/mensajes).
 * Puede filtrar los no leídos y marcarlos como leídos (PATCH .../{id}/leido).
 */
@Component({
  selector: 'app-agricultor-home',
  imports: [
    DatePipe,
    BarraSuperior,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSlideToggleModule,
  ],
  templateUrl: './agricultor-home.page.html',
  styleUrl: './agricultor-home.page.scss',
})
export class AgricultorHomePage implements OnInit {
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);

  readonly etiquetas = TIPO_MENSAJE_LABEL;
  readonly iconos = TIPO_MENSAJE_ICONO;

  mensajes = signal<Notificacion[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  soloNoLeidos = signal(false);
  actualizadoEn = signal<Date | null>(null);
  private recargar$ = new Subject<void>();

  noLeidos = computed(() => this.mensajes().filter((m) => !m.leido).length);

  /** El riego programado más cercano que todavía no pasó. */
  proximoRiego = computed(() => {
    const ahora = Date.now();
    return (
      this.mensajes()
        .filter((m) => m.tipo === 'HORA_RIEGO' && m.riegoEn && new Date(m.riegoEn).getTime() > ahora)
        .sort((a, b) => new Date(a.riegoEn!).getTime() - new Date(b.riegoEn!).getTime())[0] ?? null
    );
  });

  ngOnInit(): void {
    merge(interval(REFRESCO_MS), this.recargar$)
      .pipe(
        startWith(0),
        switchMap(() => this.api.bandeja(this.soloNoLeidos())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (lista) => {
          this.mensajes.set(lista);
          this.actualizadoEn.set(new Date());
          this.cargando.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.error.set(mensajeDeError(err));
          this.cargando.set(false);
        },
      });
  }

  cambiarFiltro(valor: boolean): void {
    this.soloNoLeidos.set(valor);
    this.cargando.set(true);
    this.recargar$.next();
  }

  marcarLeido(m: Notificacion): void {
    this.api.marcarLeido(m.id).subscribe({
      next: () => {
        if (this.soloNoLeidos()) {
          this.mensajes.update((l) => l.filter((x) => x.id !== m.id));
        } else {
          this.mensajes.update((l) => l.map((x) => (x.id === m.id ? { ...x, leido: true } : x)));
        }
      },
      error: (err) => this.error.set(mensajeDeError(err)),
    });
  }

  clase(m: Notificacion): string {
    return m.tipo === 'HORA_RIEGO' ? 'riego' : 'alerta';
  }

  hace(iso: string): string {
    return haceCuanto(iso);
  }
}
