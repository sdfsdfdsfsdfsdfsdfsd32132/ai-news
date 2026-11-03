import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.AI.news', // Ваш ID, который вы вводили
  appName: 'AI News',
  webDir: 'public', // Оставляем как есть, чтобы не было ошибки
  server: {
    // 10.0.2.2 — это специальный адрес, по которому эмулятор Android 
    // видит localhost (ваш компьютер). Порт 3000 — порт вашего Next.js.
    url: 'http://10.0.2.2:3000',
    cleartext: true // Разрешаем http (без s) для локальной разработки
  }
};

export default config;