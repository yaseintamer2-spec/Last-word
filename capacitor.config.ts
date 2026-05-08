import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lastword.app',
  appName: 'Last Word',
  webDir: 'artifacts/last-word/dist',

  android: {
    allowMixedContent: false,
    captureInput: true,
  },

  plugins: {
    AdMob: {
      androidAppId: 'ca-app-pub-1445407957198527~4580529986',
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#03050e',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
    },
  },
};

export default config;
