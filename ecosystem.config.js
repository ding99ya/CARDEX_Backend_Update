module.exports = {
  apps: [
    {
      name: "dailyUpdateScore",
      script: "/home/ec2-user/CARDEX_Backend_Update/dailyUpdateScore.js",
      // script: "/Users/yiaoding/CARDEX_Backend_Update/dailyUpdateScore.js",
      cron_restart: "10 11 * * *",
      autorestart: false,
      env: {
        TZ: "America/Chicago",
      },
    },
  ],
};
