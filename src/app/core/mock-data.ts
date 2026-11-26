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
}

const RIOS = ['Santa Mercedes', 'Caray', 'Napo'];

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
  const comisiones = ['Huacapongo', 'Choloque', 'Queneto'];
  for (let c = 1; c <= 20; c++) {
    lista.push({
      id: 3 + c,
      codigo: `CAN-${String(c).padStart(2, '0')}`,
      tipo: 'CAUDALIMETRO_CANAL',
      modelo: 'Milesight EM410-RDL',
      ubicacion: `Canal ${c} · ${comisiones[c % 3]}`,
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

function variablesPara(tipo: TipoDispositivo): Variable[] {
  if (tipo === 'ESTACION_METEO') {
    return [
      { nombre: 'temperatura', valor: azar(17, 27, 1), unidad: '°C' },
      { nombre: 'humedad', valor: azar(55, 85, 0), unidad: '%' },
      { nombre: 'precipitacion', valor: azar(0, 2, 1), unidad: 'mm' },
      { nombre: 'viento', valor: azar(0.5, 6, 1), unidad: 'm/s' },
    ];
  }
  const caudal = tipo === 'CAUDALIMETRO_RIO' ? azar(0.8, 3.5, 3) : azar(0.05, 0.6, 3);
  return [
    { nombre: 'caudal', valor: caudal, unidad: 'm3/s' },
    { nombre: 'bateria', valor: azar(70, 99, 0), unidad: '%' },
  ];
}

function caudalDemo(variables: Variable[]): EstadoCaudal {
  const caudal = variables.find((v) => v.nombre === 'caudal');
  return { litrosPorSegundo: caudal ? caudal.valor * 1000 : null, umbralAlto: null, alto: null };
}

export function estadoDemo(): DispositivoEstado[] {
  const ahora = Date.now();
  return DISPOSITIVOS_DEMO.map((d) => {
    const variables = d.senal === 'SIN_DATOS' ? [] : variablesPara(d.tipo);
    return {
      dispositivoId: d.id,
      codigo: d.codigo,
      tipo: d.tipo,
      modelo: d.modelo,
      ubicacion: d.ubicacion,
      senal: d.senal,
      medidoEn:
        d.senal === 'SIN_DATOS'
          ? null
          : new Date(ahora - (d.senal === 'SIN_SENAL' ? 45 : azar(1, 9, 0)) * 60_000).toISOString(),
      variables,
      simulada: true,
      caudal: caudalDemo(variables),
    };
  });
}

export function generarLecturaDemo(): LecturaEnVivo {
  const activos = DISPOSITIVOS_DEMO.filter((d) => d.senal === 'EN_LINEA');
  // La mitad de las veces sale un dispositivo de río, para que su gráfico se llene rápido en la demo
  const grupo = Math.random() < 0.5 ? activos.filter((x) => x.tipo === 'CAUDALIMETRO_RIO') : activos;
  const d = grupo[Math.floor(Math.random() * grupo.length)];
  const variables = variablesPara(d.tipo);
  return {
    dispositivoId: d.id,
    codigo: d.codigo,
    tipo: d.tipo,
    medidoEn: new Date().toISOString(),
    estado: Math.random() < 0.9 ? 'RECIBIDA' : 'TARDIA',
    variables,
    simulada: true,
    caudal: caudalDemo(variables),
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
    nota: 'Canal 7 por debajo del mínimo.',
    creadoEn: hace(3),
    leido: false,
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
