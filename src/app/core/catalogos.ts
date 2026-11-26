import { EstadoSenal, TipoDispositivo, TipoMensaje } from './models';

export interface Region {
  id: number;
  nombre: string;
}

export interface Junta {
  id: number;
  nombre: string;
  regionId: number;
}

export interface CatalogoRiego {
  regiones: Region[];
  juntas: Junta[];
}

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
  ALERTA_METEOROLOGICA: 'Alerta meteorológica',
};

export const TIPO_MENSAJE_ICONO: Record<TipoMensaje, string> = {
  HORA_RIEGO: 'schedule',
  ALERTA_BAJO_CAUDAL: 'trending_down',
  ALERTA_ALTO_CAUDAL: 'trending_up',
  ALERTA_METEOROLOGICA: 'thunderstorm',
};

/** Misma regla que @Pattern en SignUp*RequestDTO: 8+ caracteres, una mayúscula y un número. */
export const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
