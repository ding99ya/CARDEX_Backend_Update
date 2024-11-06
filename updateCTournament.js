const mongoose = require("mongoose");
const CTournamentModel = require("./models/CTournamentModel.js");
const CardModel = require("./models/CardModel.js");

require("dotenv").config();

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Listen to changes in the "cards" collection
mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB. Listening for changes...");
  CardModel.watch().on("change", async (change) => {
    if (
      change.operationType === "update" &&
      change.updateDescription.updatedFields.hasOwnProperty(
        "currentTournamentScore"
      )
    ) {
      console.log("Tournament Score Change detected...");
      const updatedScore =
        change.updateDescription.updatedFields.currentTournamentScore;

      const updatedCard = await CardModel.findById(
        change.documentKey._id.toString()
      );

      const { uniqueId } = updatedCard;

      // Step 1: Find all CTournament entries that contain this uniqueId in their deck
      const tournamentsToUpdate = await CTournamentModel.find({
        "deck.uniqueId": uniqueId,
      });

      const bulkOps = tournamentsToUpdate.map((tournament) => {
        // Update the `currentTournamentScore` for each relevant card in the deck
        tournament.deck.forEach((card) => {
          if (card.uniqueId === uniqueId) {
            card.currentTournamentScore = updatedScore;
          }
        });

        // Recalculate the totalTournamentScore with rarity-based multipliers
        tournament.totalTournamentScore = tournament.deck.reduce(
          (total, card) => {
            const multiplier =
              card.rarity === "LEGEND" ? 2 : card.rarity === "EPIC" ? 1.5 : 1;
            return total + card.currentTournamentScore * multiplier;
          },
          0
        );

        // Add the update operation to the bulk write array
        return {
          updateOne: {
            filter: { _id: tournament._id },
            update: {
              $set: {
                deck: tournament.deck,
                totalTournamentScore: tournament.totalTournamentScore,
              },
            },
          },
        };
      });

      // Step 2: Perform bulk write to update all affected tournaments
      if (bulkOps.length > 0) {
        console.log("Ready to write");
        await CTournamentModel.bulkWrite(bulkOps);
      }

      // Step 3: Update ranks across all CTournament entries based on totalTournamentScore
      await updateRanks();
    }
  });
});

// Helper function to update ranks based on `totalTournamentScore`
async function updateRanks() {
  const tournaments = await CTournamentModel.find().sort({
    totalTournamentScore: -1,
  });

  // Prepare bulk operations for rank updates
  const rankOps = tournaments.map((tournament, index) => ({
    updateOne: {
      filter: { _id: tournament._id },
      update: { $set: { rank: index + 1 } },
    },
  }));

  // Execute the rank updates in a single bulk write operation
  if (rankOps.length > 0) {
    await CTournamentModel.bulkWrite(rankOps);
  }
}
