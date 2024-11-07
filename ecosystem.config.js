module.exports = {
  apps: [
    {
      name: "dailyUpdateScore",
      script: "/home/ec2-user/CARDEX_Backend_Update/dailyUpdateScore.js",
      cron_restart: "0 0 * * *",
      env: {
        TZ: "America/Chicago",
      },
    },
  ],
};
