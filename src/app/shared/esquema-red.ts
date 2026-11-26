import { Component, computed, input, output, signal } from '@angular/core';
import { SENAL_LABEL } from '../core/catalogos';
import { DispositivoEstado, LecturaEnVivo } from '../core/models';

// Posiciones en píxeles sobre el plano PC2 adjunto (2048 × 1403), incluido el encabezado.
// Nxx son las cabeceras del plano. Hx y M1 son puntos de referencia del estudio.
const PUNTOS_PC2 = [
  ['CAN-01', 'N01', 1108, 605],
  ['CAN-02', 'N02', 1211, 463],
  ['CAN-03', 'N03', 302, 772],
  ['CAN-04', 'N04', 1211, 392],
  ['CAN-05', 'N05', 854, 1019],
  ['CAN-06', 'N06', 945, 959],
  ['CAN-07', 'N07', 1100, 648],
  ['CAN-08', 'N08', 1258, 185],
  ['CAN-09', 'N09', 1008, 805],
  ['CAN-10', 'N10', 1128, 538],
  ['CAN-11', 'N11', 278, 1352],
  ['CAN-12', 'N12', 1115, 595],
  ['CAN-13', 'N13', 106, 662],
  ['CAN-14', 'N14', 472, 916],
  ['CAN-15', 'N15', 1283, 135],
  ['CAN-16', 'N16', 1247, 199],
  ['CAN-17', 'N17', 1067, 718],
  ['CAN-18', 'N18', 1273, 162],
  ['CAN-19', 'N19', 823, 1034],
  ['CAN-20', 'N20', 1258, 308],
  ['HID-01', 'H1', 1249, 168],
  ['HID-02', 'H2', 1181, 365],
  ['HID-03', 'H3', 243, 1324],
  ['MET-01', 'M1', 1045, 798],
] as const;

@Component({
  selector: 'app-esquema-red',
  template: `
    <figure aria-label="Plano de la red de riego de Virú">
      <div class="herramientas">
        <span>Plano PCG-01 · Cabeceras de canal y puntos de monitoreo</span>
        <div class="enlaces">
          <button type="button" (click)="ampliado.set(!ampliado())" [attr.aria-pressed]="ampliado()">
            {{ ampliado() ? 'Ajustar plano' : 'Ampliar plano' }}
          </button>
          <a [href]="ruta" target="_blank" rel="noopener">Ver plano completo</a>
        </div>
      </div>
      <div class="visor" [class.ampliado]="ampliado()">
        <div class="plano">
          <img [src]="ruta" alt="Plano PC2 con trazados de canales, cauces y sectores de riego" />
          @for (p of nodos(); track p.dispositivo.dispositivoId) {
            <button
              type="button"
              class="punto"
              [class]="p.dispositivo.senal"
              [class.actual]="p.dispositivo.dispositivoId === seleccionadoId()"
              [class.reciente]="p.dispositivo.dispositivoId === ultimaLectura()?.dispositivoId"
              [class.caudal-alto]="p.dispositivo.caudal?.alto"
              [style.left.%]="p.x"
              [style.top.%]="p.y"
              [attr.aria-label]="p.etiqueta"
              [attr.aria-pressed]="p.dispositivo.dispositivoId === seleccionadoId()"
              [title]="p.etiqueta"
              (click)="seleccionar.emit(p.dispositivo.dispositivoId)"
            ></button>
          }
        </div>
      </div>
      <figcaption>
        <span>Consorcio Yacu (2026) · Referencias del estudio en WGS 84 / UTM 17S</span>
        @if (seleccionado(); as d) {
          <a href="#detalle-sensor">Ver detalle de {{ d.nombreCanal || d.codigo }}</a>
        }
      </figcaption>
    </figure>
  `,
  styles: `
    figure { margin: 16px 0 0; }
    .herramientas, figcaption {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px 16px;
      color: var(--viru-texto-2); font-size: .82rem;
    }
    .herramientas { margin-bottom: 10px; }
    figcaption { margin: 8px 0 2px; }
    .enlaces { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
    a, .enlaces button { color: var(--viru-canal); font-weight: 650; }
    .enlaces button {
      font: inherit; font-weight: 650; border: 1px solid var(--viru-linea);
      border-radius: 8px; padding: 5px 10px; background: #fff; cursor: pointer;
    }
    .visor {
      overflow: auto; max-height: min(76vh, 750px); border: 1px solid var(--viru-linea);
      border-radius: 12px; background: #f0f4f3; overscroll-behavior-inline: contain;
    }
    .plano {
      position: relative; width: min(100%, 880px); min-width: 560px; margin-inline: auto;
      aspect-ratio: 1540 / 1285; overflow: hidden;
    }
    .ampliado .plano { width: max(100%, 1280px); }
    img { position: absolute; top: -7.08%; left: 0; width: 132.987%; max-width: none; height: auto; }
    .punto {
      position: absolute; width: 17px; height: 17px; transform: translate(-50%, -50%);
      box-shadow: 0 0 0 1px #fff, inset 0 0 0 1px #fff;
      border-radius: 50%; border: 2px solid #526b75; background: transparent; cursor: pointer; padding: 0;
    }
    .punto.EN_LINEA { border-color: #25824a; }
    .punto.SIN_SENAL, .punto.caudal-alto { border-color: #b3261b; }
    .punto.actual, .punto:hover, .punto:focus-visible {
      z-index: 2; outline: 2px solid #10333e; outline-offset: 2px;
    }
    .punto.reciente { box-shadow: 0 0 0 4px #4fb3c485; }
  `,
})
export class EsquemaRed {
  readonly ruta = 'mapas/viru-pcg-01.png';
  readonly dispositivos = input.required<DispositivoEstado[]>();
  readonly seleccionadoId = input<number | null>(null);
  readonly ultimaLectura = input<LecturaEnVivo | null>(null);
  readonly seleccionar = output<number>();
  readonly ampliado = signal(false);
  readonly seleccionado = computed(() =>
    this.dispositivos().find((d) => d.dispositivoId === this.seleccionadoId()),
  );

  readonly nodos = computed(() => {
    const porCodigo = new Map(this.dispositivos().map((d) => [d.codigo, d]));
    return PUNTOS_PC2.flatMap(([codigo, referencia, x, y]) => {
      const dispositivo = porCodigo.get(codigo);
      if (!dispositivo) return [];
      const nombre = dispositivo.nombreCanal ? ` · ${dispositivo.nombreCanal}` : '';
      return [{
        dispositivo,
        x: (x / 1540) * 100,
        y: ((y - 91) / 1285) * 100,
        etiqueta: `${codigo}${nombre} (${referencia}) · ${SENAL_LABEL[dispositivo.senal]}`,
      }];
    });
  });
}
