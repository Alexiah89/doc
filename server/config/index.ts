export function getServerConfig() {
  return {
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development',
    version: process.env.APP_VERSION ?? '0.1.0',
    port: Number(process.env.PORT ?? 3001),
  };
}
