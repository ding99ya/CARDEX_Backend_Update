const mongoose = require("mongoose");

const CardSchema = new mongoose.Schema(
  {
    name: String,
    photo: String,
    backPhoto: String,
    rarity: String,
    uniqueId: { type: String, unique: true },
    ipoTime: String,
    price: Number,
    category: String,
    shares: Number,
    currentScore: Number,
    avgScore: Number,
    currentTournamentScore: Number,
    avgTournamentScore: Number,
    dayScore: Number,
  },
  { collection: "cards" }
);

const CardModel = mongoose.model("Card", CardSchema);
module.exports = CardModel;
