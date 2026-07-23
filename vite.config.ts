import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env의 네이버 키를 읽어 개발 서버가 검색 API를 대신 호출한다.
  // 네이버 검색 API는 CORS를 허용하지 않고 시크릿 키가 필요해 브라우저에서 직접 못 부른다.
  // (개발 서버 전용 — 배포하려면 같은 역할을 하는 백엔드가 따로 필요하다)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        // json-server(3000)로 넘긴다. 배포 환경에서는 nginx가 같은 일을 한다.
        '/api': {
          target: env.API_TARGET || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
        '/naver-api': {
          target: 'https://openapi.naver.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/naver-api/, '/v1/search'),
          headers: {
            'X-Naver-Client-Id': env.NAVER_CLIENT_ID ?? '',
            'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET ?? '',
          },
        },
      },
    },
  }
})
