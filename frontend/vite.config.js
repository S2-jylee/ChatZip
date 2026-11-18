import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 배포(https://s2-jylee.github.io/ChatZip/) 때만 하위 경로 사용. 로컬 개발·빌드는 '/'
  base: process.env.VITE_BASE || '/',
  // host: true → 같은 와이파이의 휴대폰에서 http://<PC IP>:5173 으로 접속 가능
  server: { port: 5173, host: true },
});
