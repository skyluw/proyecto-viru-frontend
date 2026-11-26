// Datos simulados para el modo demo (npm run start:demo). No se usan con el backend real.
import {
  DispositivoEstado,
  EstadoCaudal,
  EstadoSenal,
  LecturaEnVivo,
  Notificacion,
  TipoDispositivo,
  Variable,
} from './models';

interface DispositivoDemo {
  id: number;
  codigo: string;
  tipo: TipoDispositivo;
  modelo: string;
  ubicacion: string;
  senal: EstadoSenal;
  nombreCanal?: string;
}

const RIOS = ['Santa Mercedes', 'Caray', 'Napo'];
const CANALES = [
  'Alayo', 'Alfaro', 'San Juan', 'Caray', 'Choloque', 'Ciruelo', 'Hierba Luisa',
  'Higuerón', 'Huacapongo', 'Marciano', 'Napo', 'Peña Azul', 'Queneto', 'San Nicolás',
  'Santa Mercedes', 'Sarachaga', 'Susanga', 'Villegas', 'Vinzos', 'Viruly',
];

function crearDispositivos(): DispositivoDemo[] {
  const lista: DispositivoDemo[] = [];
  RIOS.forEach((lugar, i) =>
    lista.push({
      id: i + 1,
      codigo: `HID-0${i + 1}`,
      tipo: 'CAUDALIMETRO_RIO',
      modelo: 'Milesight EM410-RDL',
      ubicacion: `Río Huacapongo · ${lugar}`,
      senal: 'EN_LINEA',
    }),
  );
  for (let c = 1; c <= 20; c++) {
    lista.push({
      id: 3 + c,
      codigo: `CAN-${String(c).padStart(2, '0')}`,
      tipo: 'CAUDALIMETRO_CANAL',
      modelo: 'Milesight EM410-RDL',
      ubicacion: `Cabecera ${CANALES[c - 1]}`,
      nombreCanal: CANALES[c - 1],
      senal: c === 7 ? 'SIN_SENAL' : c === 18 ? 'SIN_DATOS' : 'EN_LINEA',
    });
  }
  lista.push({
    id: 24,
    codigo: 'MET-01',
    tipo: 'ESTACION_METEO',
    modelo: 'Milesight WTS506-915M',
    ubicacion: 'Estación compartida · Choloque',
    senal: 'EN_LINEA',
  });
  return lista;
}

export const DISPOSITIVOS_DEMO = crearDispositivos();

const azar = (min: number, max: number, dec = 2) =>
  Math.round((min + Math.random() * (max - min)) * 10 ** dec) / 10 ** dec;

function variablesPara(d: DispositivoDemo): Variable[] {
  if (d.tipo === 'ESTACION_METEO') {
    return [
      { nombre: 'temperatura', valor: azar(17, 27, 1), unidad: '°C' },
      { nombre: 'humedad', valor: azar(55, 85, 0), unidad: '%' },
      { nombre: 'precipitacion', valor: azar(0, 2, 1), unidad: 'mm' },
      { nombre: 'viento', valor: azar(0.5, 6, 1), unidad: 'm/s' },
    ];
  }
  let caudal = azar(45, 92, 1);
  if (d.tipo === 'CAUDALIMETRO_RIO') caudal = azar(275, 510, 1);
  if (d.codigo === 'CAN-06') caudal = azar(22, 30, 1);
  if (d.codigo === 'CAN-05' || d.codigo === 'CAN-12') caudal = azar(125, 145, 1);
  return [
    { nombre: 'caudal', valor: caudal, unidad: 'L/s' },
    { nombre: 'bateria', valor: azar(70, 99, 0), unidad: '%' },
  ];
}

function caudalDemo(variables: Variable[], esCanal: boolean): EstadoCaudal {
  const litros = variables.find((v) => v.nombre === 'caudal')?.valor ?? null;
  return {
    litrosPorSegundo: litros, umbralAlto: esCanal ? 120 : null, umbralBajo: esCanal ? 35 : null,
    alto: esCanal && litros !== null ? litros >= 120 : null,
    bajo: esCanal && litros !== null ? litros <= 35 : null,
  };
}

export function estadoDemo(): DispositivoEstado[] {
  const ahora = Date.now();
  return DISPOSITIVOS_DEMO.map((d) => {
    const variables = d.senal === 'SIN_DATOS' ? [] : variablesPara(d);
    const medido = d.senal === 'SIN_DATOS' ? null
      : ahora - (d.senal === 'SIN_SENAL' ? 45 : azar(0, 3, 0)) * 60_000;
    return {
      dispositivoId: d.id,
      codigo: d.codigo,
      tipo: d.tipo,
      modelo: d.modelo,
      ubicacion: d.ubicacion,
      senal: d.senal,
      medidoEn: medido === null ? null : new Date(medido).toISOString(),
      vigenteHasta: medido === null ? null : vigenciaDemo(d, medido),
      variables,
      simulada: true,
      nombreCanal: d.nombreCanal,
      caudal: caudalDemo(variables, d.tipo === 'CAUDALIMETRO_CANAL'),
    };
  });
}

function vigenciaDemo(d: DispositivoDemo, medido: number): string {
  const intervalo = d.tipo === 'ESTACION_METEO' ? 15 : d.tipo === 'CAUDALIMETRO_RIO' ? 5 : 10;
  return new Date(medido + (intervalo + 2) * 60_000).toISOString();
}

export function generarLecturaDemo(): LecturaEnVivo {
  const activos = DISPOSITIVOS_DEMO.filter((d) => d.senal === 'EN_LINEA');
  // La mitad de las veces sale un dispositivo de río, para que su gráfico se llene rápido en la demo
  const grupo = Math.random() < 0.5 ? activos.filter((x) => x.tipo === 'CAUDALIMETRO_RIO') : activos;
  const d = grupo[Math.floor(Math.random() * grupo.length)];
  const variables = variablesPara(d);
  const ahora = Date.now();
  return {
    dispositivoId: d.id,
    codigo: d.codigo,
    tipo: d.tipo,
    medidoEn: new Date(ahora).toISOString(),
    vigenteHasta: vigenciaDemo(d, ahora),
    estado: Math.random() < 0.9 ? 'RECIBIDA' : 'TARDIA',
    variables,
    simulada: true,
    caudal: caudalDemo(variables, d.tipo === 'CAUDALIMETRO_CANAL'),
  };
}

const hace = (horas: number) => new Date(Date.now() - horas * 3_600_000).toISOString();
const dentroDe = (horas: number) => new Date(Date.now() + horas * 3_600_000).toISOString();

export const BANDEJA_DEMO: Notificacion[] = [
  {
    id: 105,
    tipo: 'HORA_RIEGO',
    riegoEn: dentroDe(14),
    nota: 'Turno del sector Caray. Coordinar con el sectorista.',
    creadoEn: hace(0.5),
    leido: false,
  },
  {
    id: 104,
    tipo: 'ALERTA_BAJO_CAUDAL',
    riegoEn: null,
    nota: 'Ciruelo reportó 26 L/s. Confirma el abastecimiento con la comisión antes del turno.',
    creadoEn: hace(3),
    leido: false,
    canalCodigo: 'CAN-06',
    medidoEn: hace(3),
    simulada: true,
  },
  {
    id: 101,
    tipo: 'ALERTA_ALTO_CAUDAL',
    riegoEn: null,
    nota: 'Aumento del caudal del río Huacapongo por lluvias en la parte alta.',
    creadoEn: hace(30),
    leido: true,
  },
  {
    id: 98,
    tipo: 'HORA_RIEGO',
    riegoEn: hace(20),
    nota: null,
    creadoEn: hace(50),
    leido: true,
  },
];
