// PM2 ecosystem configuration
// https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name: 'logistics-bot',
      script: 'dist/server.js',

      // 인스턴스 설정
      instances: 1,
      exec_mode: 'fork',

      // 자동 재시작
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',

      // 크론 재시작 (매일 새벽 3시)
      cron_restart: '0 3 * * *',

      // 환경 변수
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'file:./logistics.db',
      },

      // 로그 설정
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true,

      // 재시작 정책
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      restart_delay: 1000,
    },
  ],
};
