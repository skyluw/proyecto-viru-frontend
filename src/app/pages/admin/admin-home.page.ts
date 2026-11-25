import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { interval, startWith, switchMap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { mensajeDeError } from '../../core/auth.interceptor';
import { SENAL_LABEL, TIPO_DISPOSITIVO_LABEL } from '../../core/catalogos';
import { LiveStreamService } from '../../core/live-stream.service';
import { DispositivoEstado, EstadoSenal, LecturaEnVivo, TipoDispositivo } from '../../core/models';
import { BarraSuperior } from '../../shared/barra-superior';
import { formatoVariable, haceCuanto, nombreVariable, variablePrincipal } from '../../shared/formato';
import { GraficoLinea, Punto } from '../../shared/grafico-linea';
import { EnviarMensajeData, EnviarMensajeDialog } from './enviar-mensaje.dialog';

const MAX_PUNTOS = 60; // puntos que se guardan por dispositivo para el gráfico
const REFRESCO_MS = 60_000; // el backend sugiere refrescar el snapshot cada 60 s

type FiltroTipo = 'TODOS' | TipoDispositivo;

/**
 * Home del administrador.
 * 1) Carga GET /api/admin/dispositivos/estado (y lo repite cada 60 s).
 * 2) Abre GET /api/admin/stream: cada evento "lectura" actualiza la fila y el gráfico.
 * 3) Desde aquí se envían avisos con POST /api/admin/mensajes.
 */
@Component({
  selector: 'app-admin-home',
  imports: [
    DatePipe,
    FormsModule,
    BarraSuperior,
    GraficoLinea,
    MatCardModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './admin-home.page.html',
  styleUrl: './admin-home.page.scss',
})
export class AdminHomePage implements OnInit {
  private api = inject(ApiService);
  private stream = inject(LiveStreamService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  readonly tipoLabel = TIPO_DISPOSITIVO_LABEL;
  readonly senalLabel = SENAL_LABEL;
  readonly formatoVariable = formatoVariable;
  readonly nombreVariable = nombreVariable;

  dispositivos = signal<DispositivoEstado[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  actualizadoEn = signal<Date | null>(null);
  ultimaLectura = signal<LecturaEnVivo | null>(null);
  lecturasSesion = signal(0);
  ahora = signal(Date.now());

  filtroTipo = signal<FiltroTipo>('TODOS');
  filtroSenal = signal<EstadoSenal | null>(null);
  busqueda = signal('');
  seleccionadoId = signal<number | null>(null);

  /** Historial en memoria: solo lo recibido desde que se abrió la página. */
  private historial = signal<Map<number, Punto[]>>(new Map());

  resumen = computed(() => {
    const lista = this.dispositivos();
    return {
      total: lista.length,
      enLinea: lista.filter((d) => d.senal === 'EN_LINEA').length,
      sinSenal: lista.filter((d) => d.senal === 'SIN_SENAL').length,
      sinDatos: lista.filter((d) => d.senal === 'SIN_DATOS').length,
    };
  });

  filtrados = computed(() => {
    const tipo = this.filtroTipo();
    const senal = this.filtroSenal();
    const q = this.busqueda().trim().toLowerCase();
    return this.dispositivos().filter(
      (d) =>
        (tipo === 'TODOS' || d.tipo === tipo) &&
        (!senal || d.senal === senal) &&
        (!q || d.codigo.toLowerCase().includes(q) || (d.ubicacion ?? '').toLowerCase().includes(q)),
    );
  });

  seleccionado = computed(
    () => this.dispositivos().find((d) => d.dispositivoId === this.seleccionadoId()) ?? null,
  );

  puntosSeleccionado = computed(() => {
    const id = this.seleccionadoId();
    return id === null ? [] : (this.historial().get(id) ?? []);
  });

  etiquetaGrafico = computed(() => {
    const d = this.seleccionado();
    const v = d && variablePrincipal(d.tipo, d.variables);
    return v ? `${nombreVariable(v.nombre)} (${v.unidad ?? ''})` : 'Valor';
  });

  ngOnInit(): void {
    // Snapshot inicial + refresco periódico
    interval(REFRESCO_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.api.estadoDispositivos()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (lista) => this.aplicarSnapshot(lista),
        error: (err) => {
          this.error.set(mensajeDeError(err));
          this.cargando.set(false);
        },
      });

    // Lecturas en vivo (SSE)
    this.stream
      .lecturas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((l) => this.aplicarLectura(l));

    // Reloj para los textos "hace X min"
    interval(15_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ahora.set(Date.now()));
  }

  private aplicarSnapshot(lista: DispositivoEstado[]): void {
    this.dispositivos.set(lista);
    this.actualizadoEn.set(new Date());
    this.cargando.set(false);
    this.error.set(null);
    lista.forEach((d) => d.medidoEn && this.agregarPunto(d.dispositivoId, d));
    if (this.seleccionadoId() === null && lista.length) this.seleccionadoId.set(lista[0].dispositivoId);
  }

  private aplicarLectura(l: LecturaEnVivo): void {
    this.dispositivos.update((lista) =>
      lista.map((d) =>
        d.dispositivoId === l.dispositivoId
          ? { ...d, medidoEn: l.medidoEn, variables: l.variables, senal: 'EN_LINEA' }
          : d,
      ),
    );
    this.agregarPunto(l.dispositivoId, l);
    this.ultimaLectura.set(l);
    this.lecturasSesion.update((n) => n + 1);
  }

  private agregarPunto(
    id: number,
    fuente: { tipo: TipoDispositivo; medidoEn: string | null; variables: DispositivoEstado['variables'] },
  ): void {
    const v = variablePrincipal(fuente.tipo, fuente.variables);
    if (!v || !fuente.medidoEn) return;
    const t = new Date(fuente.medidoEn);
    this.historial.update((mapa) => {
      const previos = mapa.get(id) ?? [];
      if (previos.some((p) => p.t.getTime() === t.getTime())) return mapa; // ya estaba
      const nuevo = new Map(mapa);
      nuevo.set(id, [...previos, { t, v: Number(v.valor) }].slice(-MAX_PUNTOS));
      return nuevo;
    });
  }

  claseSenal(s: EstadoSenal): string {
    return s === 'EN_LINEA' ? 'ok' : s === 'SIN_SENAL' ? 'warn' : 'muted';
  }

  icono(tipo: TipoDispositivo): string {
    return tipo === 'ESTACION_METEO' ? 'thermostat' : tipo === 'CAUDALIMETRO_RIO' ? 'waves' : 'water';
  }

  hace(iso: string | null): string {
    return haceCuanto(iso, this.ahora());
  }

  alternarFiltroSenal(s: EstadoSenal): void {
    this.filtroSenal.set(this.filtroSenal() === s ? null : s);
  }

  abrirEnvio(d?: DispositivoEstado): void {
    const data: EnviarMensajeData | null = d
      ? { tipoSugerido: 'ALERTA_BAJO_CAUDAL', notaSugerida: `${d.codigo} · ${d.ubicacion ?? ''}`.trim() }
      : null;
    this.dialog
      .open(EnviarMensajeDialog, { data, autoFocus: false })
      .afterClosed()
      .subscribe((resp) => {
        if (resp) {
          this.snack.open(`Aviso enviado a ${resp.destinatarios} agricultor(es)`, 'OK', {
            duration: 4000,
          });
        }
      });
  }
}
