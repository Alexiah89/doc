import { createServer } from 'node:http';
import { apiHandler } from './app/handler.js';
import { getServerConfig } from './config/index.js';
const config = getServerConfig();
const server = createServer(apiHandler);
server.listen(config.port, '0.0.0.0', () =>
  console.info(`FlowCircle API listening on port ${config.port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
