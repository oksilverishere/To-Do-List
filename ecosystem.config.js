// PM2 process config for the To-Do List API backend.
// Keeps the API alive (auto-restart on crash, restart on server reboot).
//
// Setup on your VPS (once, after `npm ci` + `npm run build`):
//   npm i -g pm2
//   pm2 start ecosystem.config.js
//   pm2 save        # remember the process list
//   pm2 startup     # set up auto-start on boot (do what it prints)
//
// Useful:  pm2 status | pm2 logs | pm2 restart to-do-api

module.exports = {
  apps: [
    {
      name: 'to-do-api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}