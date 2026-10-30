declare const __APP_VERSION__: string;
export const appConfig = {
  version: __APP_VERSION__,
  environment: import.meta.env.MODE,
  demoMode: import.meta.env.VITE_DEMO_MODE === 'true',
  development: import.meta.env.DEV,
};
