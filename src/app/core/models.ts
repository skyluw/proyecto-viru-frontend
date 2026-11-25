// Interfaces que copian los DTOs del backend (proyecto-viru-services/dto).
// Si Chris cambia un DTO en Java, hay que cambiarlo aquí también.

export type Role = 'ADMIN' | 'FARMER';
export type TipoDispositivo = 'CAUDALIMETRO_RIO' | 'CAUDALIMETRO_CANAL' | 'ESTACION_METEO';
export type EstadoSenal = 'EN_LINEA' | 'SIN_SENAL' | 'SIN_DATOS';
export type EstadoTransmision = 'PENDIENTE' | 'RECIBIDA' | 'TARDIA' | 'PERDIDA';
export type TipoMensaje = 'HORA_RIEGO' | 'ALERTA_BAJO_CAUDAL' | 'ALERTA_ALTO_CAUDAL';
export type AlcanceMensaje = 'JUNTA' | 'REGION';

// ---- Autenticación (AuthController: /api/users) ----
export interface LoginRequest {
  correo: string;
  password: string;
}

export interface UserResponse {
  id: number;
  nombre: string;
  correo: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  tokenType: string; // "Bearer"
  expiresInSeconds: number;
  user: UserResponse;
}

export interface SignUpFarmerRequest {
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
  juntaReganteId: number;
}

export interface SignUpAdminRequest {
  nombre: string;
  correo: string;
  password: string;
  codigoSecreto: string;
}

// ---- Monitoreo (MonitoreoController: /api/admin) ----
export interface Variable {
  nombre: string;
  valor: number;
  unidad: string | null;
}

export interface DispositivoEstado {
  dispositivoId: number;
  codigo: string;
  tipo: TipoDispositivo;
  modelo: string | null;
  ubicacion: string | null;
  senal: EstadoSenal;
  medidoEn: string | null; // Instant en ISO-8601
  variables: Variable[];
}

/** Evento "lectura" que llega por el stream SSE. */
export interface LecturaEnVivo {
  dispositivoId: number;
  codigo: string;
  tipo: TipoDispositivo;
  medidoEn: string;
  estado: EstadoTransmision;
  variables: Variable[];
}

// ---- Mensajes (MensajeController: /api/admin/mensajes) ----
export interface EnviarMensajeRequest {
  tipo: TipoMensaje;
  alcance: AlcanceMensaje;
  juntaReganteId: number | null;
  regionId: number | null;
  riegoEn: string | null;
  nota: string | null;
}

export interface MensajeEnviado {
  id: number;
  tipo: TipoMensaje;
  alcance: AlcanceMensaje;
  destinatarios: number;
  creadoEn: string;
}

// ---- Bandeja del agricultor (NotificacionController: /api/farmer/mensajes) ----
export interface Notificacion {
  id: number; // id de la entrega, se usa para marcar como leído
  tipo: TipoMensaje;
  riegoEn: string | null;
  nota: string | null;
  creadoEn: string;
  leido: boolean;
}
