const mongoose = require("mongoose");
const CardModel = require("./models/CardModel.js");
const CardHistoryScoreModel = require("./models/CardHistoryScoreModel.js");
require("dotenv").config();

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

(async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected successfully");

    // Fetch all card documents
    const cards = await CardModel.find();

    const largestDayScore = cards.reduce((max, item) => {
      return item.dayScore > max ? item.dayScore : max;
    }, 0);

    const bulkOps1 = [];

    const bulkOps2 = [];

    cards.forEach((card) => {
      const cardIPOTime = new Date(card.ipoTime);
      const currentTime = new Date();

      const differenceInDays = Math.floor(
        (currentTime - cardIPOTime) / (24 * 1000 * 60 * 60)
      );

      let modifiedDayScore;

      if (largestDayScore === 0) {
        modifiedDayScore = Math.floor(Math.random() * 101);
      } else {
        modifiedDayScore =
          Math.floor(Math.random() * 36) +
          Math.floor((card.dayScore * 65) / largestDayScore);
      }

      const newAvgScore = Math.floor(
        Number(
          (card.avgScore * differenceInDays + modifiedDayScore) /
            (differenceInDays + 1)
        )
      );

      const newCurrentScore = newAvgScore;

      const cstTime = new Date(
        currentTime.toLocaleString("en-US", { timeZone: "America/Chicago" })
      );

      const currentDay = cstTime.getDay();

      const tournamentStartDays = currentDay - 4;

      let newAvgTournamentScore;

      let newCurrentTournamentScore;

      if (currentDay === 5 || currentDay === 6 || currentDay === 0) {
        newAvgTournamentScore = Math.floor(
          Number(
            (card.avgTournamentScore * tournamentStartDays +
              card.currentTournamentScore) /
              (tournamentStartDays + 1)
          )
        );

        newCurrentTournamentScore = newAvgTournamentScore;
      } else {
        newAvgTournamentScore = card.avgTournamentScore;
        newCurrentTournamentScore = card.currentTournamentScore;
      }

      bulkOps1.push({
        updateOne: {
          filter: { _id: card._id },
          update: {
            $set: {
              currentScore: newCurrentScore,
              avgScore: newAvgScore,
              currentTournamentScore: newCurrentTournamentScore,
              avgTournamentScore: newAvgTournamentScore,
              dayScore: 0,
            },
          },
        },
      });

      bulkOps2.push({
        updateOne: {
          filter: { uniqueId: card.uniqueId },
          update: {
            $push: {
              historyScore: {
                time: formatDate(cstTime),
                score: modifiedDayScore,
              },
            },
            $setOnInsert: { uniqueId: card.uniqueId },
          },
          upsert: true,
        },
      });
    });

    // Execute bulk update operations
    if (bulkOps1.length > 0) {
      await CardModel.bulkWrite(bulkOps1);
      console.log("Card scores updated successfully");
    } else {
      console.log("No cards score found for updating.");
    }

    if (bulkOps2.length > 0) {
      await CardHistoryScoreModel.bulkWrite(bulkOps2);
      console.log("Card scores history updated successfully");
    } else {
      console.log("No cards scores history found for updating.");
    }
  } catch (error) {
    console.error("Error updating card scores:", error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("MongoDB connection closed");
  }
})();
