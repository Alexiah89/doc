import { getServerConfig } from '../config/index.js';
export function health() {
  const config = getServerConfig();
  return {
    status: 'ok',
    environment: config.environment,
    version: config.version,
    timestamp: new Date().toISOString(),
  };
}
