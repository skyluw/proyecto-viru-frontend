import { EstadoSenal, TipoDispositivo, TipoMensaje } from './models';

// IMPORTANTE: el backend todavía no tiene un endpoint para listar regiones y juntas
// (sería algo como GET /api/juntas). Mientras tanto se usan estos valores fijos.
// Confirmar los id con la base de datos:
//   SELECT id, nombre FROM region;
//   SELECT id, nombre, region_id FROM junta_regante;

export interface Region {
  id: number;
  nombre: string;
}

export interface Junta {
  id: number;
  nombre: string;
  regionId: number;
}

export const REGIONES: Region[] = [
  { id: 1, nombre: 'Huacapongo' },
  { id: 2, nombre: 'Choloque' },
  { id: 3, nombre: 'Queneto' },
];

export const JUNTAS: Junta[] = [
  { id: 1, nombre: 'Comisión de Usuarios Huacapongo', regionId: 1 },
  { id: 2, nombre: 'Comisión de Usuarios Choloque', regionId: 2 },
  { id: 3, nombre: 'Comisión de Usuarios Queneto', regionId: 3 },
];

// Textos para mostrar los enums del backend en la interfaz.
export const TIPO_DISPOSITIVO_LABEL: Record<TipoDispositivo, string> = {
  CAUDALIMETRO_RIO: 'Río',
  CAUDALIMETRO_CANAL: 'Canal',
  ESTACION_METEO: 'Estación meteorológica',
};

export const SENAL_LABEL: Record<EstadoSenal, string> = {
  EN_LINEA: 'En línea',
  SIN_SENAL: 'Sin señal',
  SIN_DATOS: 'Sin datos',
};

export const TIPO_MENSAJE_LABEL: Record<TipoMensaje, string> = {
  HORA_RIEGO: 'Hora de riego',
  ALERTA_BAJO_CAUDAL: 'Alerta: bajo caudal',
  ALERTA_ALTO_CAUDAL: 'Alerta: alto caudal',
};

export const TIPO_MENSAJE_ICONO: Record<TipoMensaje, string> = {
  HORA_RIEGO: 'schedule',
  ALERTA_BAJO_CAUDAL: 'trending_down',
  ALERTA_ALTO_CAUDAL: 'trending_up',
};

/** Misma regla que @Pattern en SignUp*RequestDTO: 8+ caracteres, una mayúscula y un número. */
export const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
