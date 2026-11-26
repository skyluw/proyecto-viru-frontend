import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input, model, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map } from 'rxjs';
import { CanalMapa, DispositivoEstado, TipoDispositivo } from '../core/models';

type PuntoRed = Omit<CanalMapa, 'propio'> & { propio?: boolean; tipo?: TipoDispositivo };

// Cabeceras y puntos de referencia del PCG-01. El segundo par, cuando existe,
// mueve el control para evitar superposiciones sin cambiar el anclaje en el plano.
const PUNTOS_PC2 = [
  ['CAN-01', 'N01', 1108, 605, 1035, 580],
  ['CAN-02', 'N02', 1211, 463, 1260, 471],
  ['CAN-03', 'N03', 302, 772],
  ['CAN-04', 'N04', 1211, 392, 1261, 390],
  ['CAN-05', 'N05', 854, 1019, 907, 1062],
  ['CAN-06', 'N06', 945, 959, 971, 935],
  ['CAN-07', 'N07', 1100, 648, 1141, 662],
  ['CAN-08', 'N08', 1258, 185, 1320, 248],
  ['CAN-09', 'N09', 1008, 805, 960, 799],
  ['CAN-10', 'N10', 1128, 538, 1149, 519],
  ['CAN-11', 'N11', 278, 1352, 335, 1330],
  ['CAN-12', 'N12', 1115, 595, 1194, 591],
  ['CAN-13', 'N13', 106, 662],
  ['CAN-14', 'N14', 472, 916],
  ['CAN-15', 'N15', 1283, 135, 1305, 117],
  ['CAN-16', 'N16', 1247, 199, 1194, 235],
  ['CAN-17', 'N17', 1067, 718, 1031, 697],
  ['CAN-18', 'N18', 1273, 162, 1330, 182],
  ['CAN-19', 'N19', 823, 1034, 787, 1075],
  ['CAN-20', 'N20', 1258, 308, 1295, 311],
  ['HID-01', 'H1', 1249, 168, 1182, 155],
  ['HID-02', 'H2', 1181, 365, 1117, 346],
  ['HID-03', 'H3', 243, 1324, 183, 1300],
  ['MET-01', 'M1', 1045, 798, 1112, 797],
] as const;

const REFERENCIAS = new Map<string, (typeof PUNTOS_PC2)[number]>(PUNTOS_PC2.map((p) => [p[0], p]));
const NOMBRES_SENSORES: Record<string, string> = {
  'HID-01': 'Río · sector alto',
  'HID-02': 'Río · sector medio',
  'HID-03': 'Río · sector bajo',
  'MET-01': 'Estación meteorológica',
};

const ESTADOS = {
  alto: { etiqueta: 'Caudal alto', prioridad: 0, simbolo: '↑' },
  bajo: { etiqueta: 'Caudal bajo', prioridad: 1, simbolo: '↓' },
  vencida: { etiqueta: 'Lectura vencida', prioridad: 2, simbolo: '!' },
  'sin-caudal': { etiqueta: 'Sin caudal medido', prioridad: 3, simbolo: '–' },
  'sin-datos': { etiqueta: 'Sin lectura', prioridad: 4, simbolo: '–' },
  vigente: { etiqueta: 'Lectura vigente', prioridad: 5, simbolo: '•' },
} as const;

export function estadoEnMapa(punto: PuntoRed, ahora: number): keyof typeof ESTADOS {
  if (!punto.medidoEn) return 'sin-datos';
  if (punto.senal === 'SIN_SENAL' || (punto.vigenteHasta && Date.parse(punto.vigenteHasta) < ahora)) {
    return 'vencida';
  }
  if (punto.codigo.startsWith('CAN-') && punto.caudal?.litrosPorSegundo == null) return 'sin-caudal';
  if (punto.caudal?.alto) return 'alto';
  if (punto.caudal?.bajo) return 'bajo';
  return 'vigente';
}

type CanalEnMapa = Pick<DispositivoEstado, 'dispositivoId' | 'codigo'> & {
  nombre: string;
  propio: boolean;
  referencia?: string;
  tipo?: TipoDispositivo;
  medidoEn: string | null;
  caudal: number | null;
  simulada?: boolean | null;
  umbralAlto: number | null;
  umbralBajo: number | null;
  estado: keyof typeof ESTADOS;
  etiqueta: string;
  simbolo: string;
  pin?: { x: number; y: number; controlX: number; controlY: number };
};

@Component({
  selector: 'app-esquema-red',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './esquema-red.html',
  styleUrl: './esquema-red.scss',
})
export class EsquemaRed {
  readonly dispositivos = input.required<PuntoRed[]>();
  readonly comision = input<string | null>(null);
  readonly administrador = input(false);
  readonly seleccionadoId = model<number | null>(null);
  readonly verHistorial = output<void>();
  readonly ampliado = signal(false);
  readonly soloPropios = signal(false);
  private readonly ahora = toSignal(interval(15_000).pipe(map(() => Date.now())), { initialValue: Date.now() });

  readonly lista = computed(() => {
    const ahora = this.ahora();
    return this.dispositivos()
      .filter((p) => !this.soloPropios() || p.propio)
      .map((p): CanalEnMapa => {
        const ubicacion = REFERENCIAS.get(p.codigo);
        const estado = estadoEnMapa(p, ahora);
        return {
          dispositivoId: p.dispositivoId,
          codigo: p.codigo,
          nombre: p.nombreCanal || NOMBRES_SENSORES[p.codigo] || p.codigo,
          propio: p.propio ?? false,
          referencia: ubicacion?.[1],
          tipo: p.tipo,
          medidoEn: p.medidoEn,
          caudal: p.caudal?.litrosPorSegundo ?? null,
          simulada: p.simulada,
          umbralAlto: p.caudal?.umbralAlto ?? null,
          umbralBajo: p.caudal?.umbralBajo ?? null,
          estado,
          etiqueta: ESTADOS[estado].etiqueta,
          simbolo: ESTADOS[estado].simbolo,
          pin: ubicacion && {
            x: ubicacion[2],
            y: ubicacion[3] - 90,
            controlX: ubicacion[4] ?? ubicacion[2],
            controlY: (ubicacion[5] ?? ubicacion[3]) - 90,
          },
        };
      });
  });

  readonly canales = computed(() => this.lista()
    .filter((p) => !p.tipo || p.tipo === 'CAUDALIMETRO_CANAL')
    .sort((a, b) => ESTADOS[a.estado].prioridad - ESTADOS[b.estado].prioridad || a.codigo.localeCompare(b.codigo)));

  readonly seleccionado = computed(() => this.lista().find((c) => c.dispositivoId === this.seleccionadoId())
    ?? this.canales().find((c) => c.propio) ?? this.canales().at(0) ?? this.lista().at(0) ?? null);

  filtrar(soloPropios: boolean): void {
    this.soloPropios.set(soloPropios);
  }
}
