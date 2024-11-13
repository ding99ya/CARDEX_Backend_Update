module.exports = {
  apps: [
    {
      name: "dailyUpdateScore",
      script: "/home/ec2-user/CARDEX_Backend_Update/dailyUpdateScore.js",
      // script: "/Users/yiaoding/CARDEX_Backend_Update/dailyUpdateScore.js",
      cron_restart: "00 06 * * *",
      autorestart: false,
      env: {
        TZ: "America/Chicago",
      },
    },
  ],
};
