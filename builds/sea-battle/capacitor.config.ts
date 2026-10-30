import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'ru.closeapps.seabattle',
  appName: 'Close Sea Battle',
  webDir: 'www',
  bundledWebRuntime: false,
  server: { androidScheme: 'https' }
};
export default config;
