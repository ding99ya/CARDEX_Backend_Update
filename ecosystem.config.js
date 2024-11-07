module.exports = {
  apps: [
    {
      name: "dailyUpdateScore",
      script: "/home/ec2-user/CARDEX_Backend_Update/dailyUpdateScore.js",
      cron_restart: "48 10 * * *",
      env: {
        TZ: "America/Chicago",
      },
    },
  ],
};
