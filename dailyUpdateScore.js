const mongoose = require("mongoose");
const CardModel = require("./models/CardModel.js");
require("dotenv").config();

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

    // Prepare bulk operations to update each card
    const bulkOps = cards.map((card) => {
      const cardIPOTime = new Date(card.ipoTime);
      const currentTime = new Date();

      const differenceInDays = Math.floor(
        (currentTime - cardIPOTime) / (24 * 1000 * 60 * 60)
      );

      const newAvgScore = Number(
        (card.avgScore * differenceInDays + card.dayScore) /
          (differenceInDays + 1)
      ).toFixed(2);

      const newCurrentScore = newAvgScore;

      const cstTime = new Date(
        currentTime.toLocaleString("en-US", { timeZone: "America/Chicago" })
      );

      const currentDay = cstTime.getDay();

      const tournamentStartDays = currentDay - 1;

      const newAvgTournamentScore = Number(
        (card.avgTournamentScore * tournamentStartDays + card.dayScore) /
          (tournamentStartDays + 1)
      ).toFixed(2);

      const newCurrentTournamentScore = newAvgTournamentScore;

      return {
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
      };
    });

    // Execute bulk update operations
    if (bulkOps.length > 0) {
      await CardModel.bulkWrite(bulkOps);
      console.log("Card scores updated successfully");
      console.log("Script started at:", new Date().toString());
    } else {
      console.log("No cards found for updating.");
    }
  } catch (error) {
    console.error("Error updating card scores:", error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("MongoDB connection closed");
  }
})();
