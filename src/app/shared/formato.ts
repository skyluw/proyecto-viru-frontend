import { TipoDispositivo, Variable } from '../core/models';

const NOMBRES: Record<string, string> = {
  caudal: 'Caudal',
  nivel: 'Nivel',
  distancia: 'Distancia al agua',
  distance_mm: 'Distancia al agua',
  bateria: 'Batería',
  battery_pct: 'Batería',
  temperatura: 'Temperatura',
  humedad: 'Humedad',
  precipitacion: 'Precipitación',
  viento: 'Viento',
  presion: 'Presión',
};

/** "caudal" -> "Caudal". Si el backend manda otra variable, se muestra tal cual. */
export function nombreVariable(nombre: string): string {
  return NOMBRES[nombre.toLowerCase()] ?? nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

export function formatoVariable(v: Variable): string {
  const valor = Number(v.valor).toLocaleString('es-PE', { maximumFractionDigits: 3 });
  return `${valor} ${v.unidad ?? ''}`.trim();
}

/** Variable que se grafica para cada tipo de dispositivo. */
export function variablePrincipal(tipo: TipoDispositivo, variables: Variable[]): Variable | null {
  const esMeteo = tipo === 'ESTACION_METEO';
  const preferida = esMeteo ? 'temperatura' : 'caudal';
  const distancia = esMeteo
    ? undefined
    : variables.find((v) => v.nombre.toLowerCase() === 'distance_mm');
  return (
    variables.find((v) => v.nombre.toLowerCase() === preferida) ??
    distancia ??
    variables.find((v) => !['bateria', 'battery_pct'].includes(v.nombre.toLowerCase())) ??
    variables[0] ??
    null
  );
}

/** "hace 3 min", "hace 2 h"… a partir de un Instant ISO. */
export function haceCuanto(iso: string | null, ahora = Date.now()): string {
  if (!iso) return '—';
  const seg = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 1000));
  if (seg < 60) return `hace ${seg} s`;
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}
