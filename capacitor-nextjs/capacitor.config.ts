import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.notificationservice.tododemo',
  appName: 'Notification Service Todo',
  // Next.js static export writes to `out/`.
  webDir: 'out',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
