const mongoose = require("mongoose");
const CardModel = require("./models/CardModel.js");
const CTournamentModel = require("./models/CTournamentModel.js");

require("dotenv").config();

// Connect to the MongoDB database
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const updateScores = async () => {
  try {
    // Step 1: Find the largest dayScore in the "cards" collection
    const largestDayScore = await CardModel.findOne()
      .sort({ dayScore: -1 })
      .select("dayScore -_id")
      .lean();

    if (!largestDayScore) {
      console.log("No cards found.");
      return;
    }

    const maxDayScore = largestDayScore.dayScore;

    // Step 1.1: Compute the "currentTournamentScore" for all cards
    const cardUpdates = await CardModel.find().lean();
    const cardScoreMap = {}; // Hash table for storing currentTournamentScore by uniqueId
    const cardBulkOps = cardUpdates.map((card) => {
      let currentTournamentScore;

      if (maxDayScore === 0) {
        currentTournamentScore = Math.floor(Math.random() * 101);
      } else {
        currentTournamentScore =
          Math.floor(Math.random() * 36) +
          Math.floor((card.dayScore * 65) / maxDayScore);
      }

      cardScoreMap[card.uniqueId] = currentTournamentScore; // Store in hash table for step 2
      return {
        updateOne: {
          filter: { _id: card._id },
          update: { $set: { currentTournamentScore } },
        },
      };
    });

    // Perform bulk update for "cards"
    if (cardBulkOps.length > 0) {
      await CardModel.bulkWrite(cardBulkOps);
      console.log("Updated currentTournamentScore for all cards.");
    }

    // Step 2: Update "deck" and "totalTournamentScore" in CTournament
    const tournamentUpdates = await CTournamentModel.find().lean();
    const tournamentBulkOps = tournamentUpdates.map((tournament) => {
      let totalTournamentScore = 0;

      const updatedDeck = tournament.deck.map((card) => {
        const cardScore = cardScoreMap[card.uniqueId] || 0; // Use hash table for efficiency
        const rarityFactor =
          card.rarity === "LEGEND" ? 2 : card.rarity === "EPIC" ? 1.5 : 1; // Determine rarity factor
        totalTournamentScore += cardScore * rarityFactor;
        return {
          ...card,
          currentTournamentScore: cardScore, // Update currentTournamentScore in deck
        };
      });

      return {
        updateOne: {
          filter: { _id: tournament._id },
          update: {
            $set: {
              deck: updatedDeck,
              totalTournamentScore: Math.floor(totalTournamentScore),
            },
          },
        },
      };
    });

    // Perform bulk update for "CTournament"
    if (tournamentBulkOps.length > 0) {
      await CTournamentModel.bulkWrite(tournamentBulkOps);
      console.log("Updated deck and totalTournamentScore for all tournaments.");
    }

    console.log("Scores updated successfully!");

    // Step 3: Compute and update ranks
    const updatedTournaments = await CTournamentModel.find()
      .sort({ totalTournamentScore: -1 }) // Sort by score in descending order
      .lean();

    const rankBulkOps = updatedTournaments.map((tournament, index) => ({
      updateOne: {
        filter: { _id: tournament._id },
        update: { $set: { rank: index + 1 } }, // Rank starts from 1
      },
    }));

    if (rankBulkOps.length > 0) {
      await CTournamentModel.bulkWrite(rankBulkOps);
      console.log("Updated ranks for all tournaments.");
    }

    console.log("Scores and ranks updated successfully!");
  } catch (error) {
    console.error("Error updating scores:", error);
  } finally {
    mongoose.connection.close();
  }
};

const runUpdateScoresIfAllowed = () => {
  const currentTime = new Date();
  const chicagoTime = new Date(
    currentTime.toLocaleString("en-US", { timeZone: "America/Chicago" })
  );

  const currentDay = chicagoTime.getDay(); // 0: Sunday, 1: Monday, ..., 6: Saturday
  const currentHour = chicagoTime.getHours(); // 0-23

  // Check if the current time is within Thursday 12:00 PM to Sunday 12:00 PM
  const isWithinAllowedWindow =
    (currentDay === 4 && currentHour >= 12) || // Thursday after 12:00 PM
    (currentDay > 4 && currentDay < 7) || // Friday to Saturday
    (currentDay === 0 && currentHour < 12); // Sunday before 12:00 PM

  if (isWithinAllowedWindow) {
    console.log("Within the allowed time window. Running updateScores...");
    updateScores();
  } else {
    console.log("Not within the allowed time window. Skipping updateScores.");
  }
};

// Call this function instead of directly calling updateScores
runUpdateScoresIfAllowed();
