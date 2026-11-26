import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EMPTY, catchError, interval, map, startWith, switchMap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { mensajeDeError } from '../../core/auth.interceptor';
import { SENAL_LABEL, TIPO_DISPOSITIVO_LABEL } from '../../core/catalogos';
import { LiveStreamService } from '../../core/live-stream.service';
import { DispositivoEstado, EstadoSenal, LecturaEnVivo, Muestra, TipoDispositivo } from '../../core/models';
import { BarraSuperior } from '../../shared/barra-superior';
import { formatoVariable, haceCuanto, nombreVariable, variablePrincipal } from '../../shared/formato';
import { EsquemaRed } from '../../shared/esquema-red';
import { GraficoLinea } from '../../shared/grafico-linea';
import { EnviarMensajeData, EnviarMensajeDialog } from './enviar-mensaje.dialog';
import { PrediosDialog } from './predios.dialog';

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
    EsquemaRed,
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
  private seleccion$ = toObservable(this.seleccionadoId);

  private historial = signal<Map<number, Muestra[]>>(new Map());
  historialError = signal(false);

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
        (!q || [d.codigo, d.nombreCanal, d.ubicacion].some((txt) => txt?.toLowerCase().includes(q))),
    );
  });

  seleccionado = computed(
    () => this.dispositivos().find((d) => d.dispositivoId === this.seleccionadoId()) ?? null,
  );

  puntosSeleccionado = computed(() => {
    const d = this.seleccionado();
    const variable = d && this.principal(d);
    if (!d || !variable) return [];
    return (this.historial().get(d.dispositivoId) ?? []).flatMap((muestra) => {
      const v = muestra.variables.find((item) =>
        item.nombre.toLowerCase() === variable.nombre.toLowerCase() && item.unidad === variable.unidad,
      );
      return v ? [{ t: new Date(muestra.medidoEn), v: Number(v.valor) }] : [];
    });
  });

  etiquetaGrafico = computed(() => {
    const d = this.seleccionado();
    const v = d && variablePrincipal(d.tipo, d.variables);
    return v ? [nombreVariable(v.nombre), v.unidad && `(${v.unidad})`].filter(Boolean).join(' ') : 'Valor';
  });

  ngOnInit(): void {
    // Snapshot inicial + refresco periódico
    interval(REFRESCO_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.api.estadoDispositivos().pipe(catchError((err) => {
          this.error.set(mensajeDeError(err));
          this.cargando.set(false);
          return EMPTY;
        }))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((lista) => this.aplicarSnapshot(lista));

    this.seleccion$.pipe(
      switchMap((id) => {
        this.historialError.set(false);
        return id === null ? EMPTY : this.api.historial(id).pipe(
          map((muestras) => ({ id, muestras })),
          catchError(() => {
            this.historialError.set(true);
            return EMPTY;
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ id, muestras }) => this.agregarMuestras(id, muestras));

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
    this.dispositivos.update((anterior) => {
      const porId = new Map(anterior.map((d) => [d.dispositivoId, d]));
      return lista.map((d) => {
        const previa = porId.get(d.dispositivoId);
        if (previa?.medidoEn && (!d.medidoEn || Date.parse(previa.medidoEn) > Date.parse(d.medidoEn))) {
          return previa;
        }
        return d;
      });
    });
    this.actualizadoEn.set(new Date());
    this.cargando.set(false);
    this.error.set(null);
    lista.forEach((d) => {
      if (d.medidoEn) this.agregarMuestras(d.dispositivoId, [{ ...d, medidoEn: d.medidoEn }]);
    });
    if (this.seleccionadoId() === null && lista.length) this.seleccionadoId.set(lista[0].dispositivoId);
  }

  private aplicarLectura(l: LecturaEnVivo): void {
    this.dispositivos.update((lista) =>
      lista.map((d) =>
        d.dispositivoId === l.dispositivoId && (!d.medidoEn || Date.parse(d.medidoEn) <= Date.parse(l.medidoEn))
          ? { ...d, medidoEn: l.medidoEn, variables: l.variables, senal: 'EN_LINEA',
              simulada: l.simulada, caudal: l.caudal }
          : d,
      ),
    );
    this.agregarMuestras(l.dispositivoId, [l]);
    this.ultimaLectura.set(l);
    this.lecturasSesion.update((n) => n + 1);
  }

  private agregarMuestras(id: number, muestras: Muestra[]): void {
    this.historial.update((mapa) => {
      const porFecha = new Map((mapa.get(id) ?? []).map((m) => [m.medidoEn, m]));
      muestras.forEach((m) => porFecha.set(m.medidoEn, m));
      const recientes = [...porFecha.values()]
        .sort((a, b) => Date.parse(a.medidoEn) - Date.parse(b.medidoEn)).slice(-MAX_PUNTOS);
      const nuevo = new Map(mapa);
      nuevo.set(id, recientes);
      return nuevo;
    });
  }

  /** Variable más importante del sensor (caudal o temperatura). */
  principal(d: DispositivoEstado) {
    return variablePrincipal(d.tipo, d.variables);
  }

  numero(valor: number): string {
    return Number(valor).toLocaleString('es-PE', { maximumFractionDigits: 3 });
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

  abrirPredios(): void {
    this.dialog.open(PrediosDialog, { width: '640px', maxWidth: '95vw' });
  }
}
