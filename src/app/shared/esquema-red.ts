import { Component, computed, input, output } from '@angular/core';
import { DispositivoEstado, EstadoSenal, LecturaEnVivo } from '../core/models';

interface Nodo {
  id: number;
  codigo: string;
  senal: EstadoSenal;
  x: number;
  y: number;
  r: number;
  // punto donde el canal sale del río (solo canales)
  desdeX?: number;
  desdeY?: number;
  etiquetaY: number;
}

const ANCHO_RIO = 1000;
/** Curva suave del río: y según x. */
const rioY = (x: number) => 128 + 12 * Math.sin(x / 135) - 6 * Math.cos(x / 61);

/**
 * Esquema hidráulico (no a escala) del río Huacapongo con sus canales y la estación
 * meteorológica. Cada sensor es un punto coloreado según su señal; al hacer clic se elige.
 */
@Component({
  selector: 'app-esquema-red',
  template: `
    <div class="contenedor">
      <svg
        [attr.viewBox]="'0 0 1080 256'"
        role="group"
        aria-label="Esquema del río Huacapongo, sus canales y la estación meteorológica"
      >
        <!-- Río -->
        <path class="rio-borde" [attr.d]="rioPath" />
        <path class="rio" [attr.d]="rioPath" />
        <text class="nombre-rio" x="24" [attr.y]="rioY(24) + 34">Río Huacapongo</text>

        <!-- Canales -->
        @for (n of canales(); track n.id) {
          <line class="canal" [attr.x1]="n.desdeX" [attr.y1]="n.desdeY" [attr.x2]="n.x" [attr.y2]="n.y" />
        }

        <!-- Pulso de la última lectura recibida -->
        @for (p of pulso(); track p.clave) {
          <circle class="pulso" [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="p.r" />
        }

        <!-- Sensores -->
        @for (n of todos(); track n.id) {
          <g
            class="nodo"
            [class]="n.senal"
            [class.elegido]="n.id === seleccionadoId()"
            role="button"
            tabindex="0"
            [attr.aria-label]="n.codigo + ', ' + textoSenal[n.senal]"
            (click)="seleccionar.emit(n.id)"
            (keydown.enter)="seleccionar.emit(n.id)"
            (keydown.space)="seleccionar.emit(n.id); $event.preventDefault()"
          >
            <title>{{ n.codigo }}, {{ textoSenal[n.senal] }}</title>
            <circle class="anillo" [attr.cx]="n.x" [attr.cy]="n.y" [attr.r]="n.r + 6" />
            @if (esMeteo(n)) {
              <rect
                class="punto"
                [attr.x]="n.x - n.r"
                [attr.y]="n.y - n.r"
                [attr.width]="n.r * 2"
                [attr.height]="n.r * 2"
                [attr.transform]="'rotate(45 ' + n.x + ' ' + n.y + ')'"
              />
            } @else {
              <circle class="punto" [attr.cx]="n.x" [attr.cy]="n.y" [attr.r]="n.r" />
            }
            <text class="etiqueta" [attr.x]="n.x" [attr.y]="n.etiquetaY">{{ n.codigo }}</text>
          </g>
        }
      </svg>
    </div>
  `,
  styles: `
    :host { display: block; }
    .contenedor { overflow-x: auto; }
    svg { display: block; width: 100%; min-width: 760px; height: auto; font-family: inherit; }

    .rio-borde { fill: none; stroke: #cfe6ea; stroke-width: 22; stroke-linecap: round; }
    .rio { fill: none; stroke: var(--viru-canal); stroke-width: 9; stroke-linecap: round; }
    .nombre-rio { font-size: 13px; font-weight: 600; fill: var(--viru-canal); font-stretch: 112%; }
    .canal { stroke: #7fb6bf; stroke-width: 3; stroke-linecap: round; }

    .nodo { cursor: pointer; outline: none; }
    .punto { stroke: #fff; stroke-width: 2.5; transition: r 0.15s; }
    .EN_LINEA .punto { fill: var(--viru-palta); }
    .SIN_SENAL .punto { fill: var(--viru-alerta); }
    .SIN_DATOS .punto { fill: #fff; stroke: var(--viru-gris); stroke-width: 2.5; stroke-dasharray: 3 2; }

    .anillo { fill: none; stroke: transparent; stroke-width: 2.5; }
    .nodo:hover .anillo, .nodo:focus-visible .anillo { stroke: #9fc9cf; }
    .elegido .anillo { stroke: var(--viru-agua) !important; }

    .etiqueta { font-size: 11px; text-anchor: middle; fill: var(--viru-texto-2); font-variant-numeric: tabular-nums; }
    .elegido .etiqueta { fill: var(--viru-agua); font-weight: 700; }
    .SIN_SENAL .etiqueta { fill: var(--viru-alerta); font-weight: 600; }

    .pulso { fill: none; stroke: var(--viru-palta); stroke-width: 2; animation: pulso 1.6s ease-out forwards; transform-box: fill-box; transform-origin: center; }
    @keyframes pulso { from { opacity: 0.9; transform: scale(1); } to { opacity: 0; transform: scale(3.2); } }
  `,
})
export class EsquemaRed {
  dispositivos = input.required<DispositivoEstado[]>();
  seleccionadoId = input<number | null>(null);
  ultimaLectura = input<LecturaEnVivo | null>(null);
  seleccionar = output<number>();

  readonly rioY = rioY;
  readonly textoSenal: Record<EstadoSenal, string> = {
    EN_LINEA: 'en línea',
    SIN_SENAL: 'sin señal',
    SIN_DATOS: 'sin datos',
  };

  readonly rioPath = (() => {
    const pts: string[] = [];
    for (let x = 20; x <= ANCHO_RIO; x += 10) pts.push(`${x},${rioY(x).toFixed(1)}`);
    return `M${pts.join(' L')}`;
  })();

  /** Los canales se reparten a lo largo del río, alternando arriba y abajo. */
  canales = computed<Nodo[]>(() => {
    const lista = this.dispositivos()
      .filter((d) => d.tipo === 'CAUDALIMETRO_CANAL')
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
    const inicio = 60;
    const paso = lista.length > 1 ? (ANCHO_RIO - 2 * inicio) / (lista.length - 1) : 0;
    return lista.map((d, i) => {
      const desdeX = inicio + i * paso;
      const arriba = i % 2 === 0;
      const x = desdeX + 10;
      const y = rioY(desdeX) + (arriba ? -78 : 78);
      return {
        id: d.dispositivoId,
        codigo: d.codigo,
        senal: d.senal,
        x,
        y,
        r: 8,
        desdeX,
        desdeY: rioY(desdeX),
        etiquetaY: arriba ? y - 15 : y + 23,
      };
    });
  });

  /** Sensores de río: sobre el cauce, entre canales. */
  rios = computed<Nodo[]>(() => {
    const lista = this.dispositivos()
      .filter((d) => d.tipo === 'CAUDALIMETRO_RIO')
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
    // Se ubican justo entre dos canales para que no se tapen
    const nCanales = Math.max(this.canales().length, 2);
    const paso = (ANCHO_RIO - 120) / (nCanales - 1);
    return lista.map((d, i) => {
      const k = Math.round(((i + 0.5) * nCanales) / lista.length - 0.5);
      const x = 60 + (Math.min(k, nCanales - 2) + 0.5) * paso;
      const y = rioY(x);
      return { id: d.dispositivoId, codigo: d.codigo, senal: d.senal, x, y, r: 11, etiquetaY: y + 32 };
    });
  });

  /** Estación meteorológica: fuera del cauce, a la derecha. */
  meteo = computed<Nodo[]>(() =>
    this.dispositivos()
      .filter((d) => d.tipo === 'ESTACION_METEO')
      .map((d, i) => ({
        id: d.dispositivoId,
        codigo: d.codigo,
        senal: d.senal,
        x: 1040,
        y: 64 + i * 70,
        r: 10,
        etiquetaY: 64 + i * 70 + 30,
      })),
  );

  todos = computed(() => [...this.canales(), ...this.rios(), ...this.meteo()]);

  /** Un círculo que se expande donde llegó la última lectura. */
  pulso = computed(() => {
    const l = this.ultimaLectura();
    if (!l) return [];
    const n = this.todos().find((x) => x.id === l.dispositivoId);
    return n ? [{ clave: `${l.dispositivoId}-${l.medidoEn}`, x: n.x, y: n.y, r: n.r }] : [];
  });

  esMeteo(n: Nodo): boolean {
    return this.meteo().some((m) => m.id === n.id);
  }
}
