// Configuración normal: la web llama al backend real de Spring Boot.
// apiUrl vacío = mismo origen. En desarrollo, proxy.conf.json reenvía /api a localhost:8080;
// en producción, Nginx reenvía /api al servidor APP.
export const environment = {
  apiUrl: '',
  useMock: false,
};
