// =========================================================
//  TERAHEADBMS — Capacitor Config (Android APK)
//  The mobile app connects to a TERAHEADBMS server running
//  on the same LAN (the .exe desktop app, or node server.js)
// =========================================================

/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.terahead.bms',
  appName: 'TERAHEADBMS',
  // 'webDir' points to the frontend HTML/JS files
  webDir: 'public',
  // The mobile app discovers and connects to the LAN server
  // No local server is bundled in the APK
  server: {
    // Allow cleartext (http://) connections to the LAN server
    // androidScheme must be 'http' for LAN access
    androidScheme: 'http',
    // Allow navigation to local network addresses
    allowNavigation: [
      'http://192.168.*.*',
      'http://10.*.*.*',
      'http://172.16.*.*',
      'http://localhost:3000'
    ]
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      showSpinner: true,
      spinnerColor: '#4fc3f7'
    }
  }
};

module.exports = config;
