const mongoose = require("mongoose");

const deckSchema = new mongoose.Schema({
  name: { type: String, required: true },
  uniqueId: { type: String, required: true },
  photo: { type: String, require: true },
  currentTournamentScore: { type: Number, required: true },
  rarity: { type: String, required: true },
});

const CTournamentSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true },
  username: { type: String, required: true },
  profilePhoto: { type: String, required: false },
  deckId: { type: String, required: true },
  rank: { type: Number, required: true },
  totalTournamentScore: { type: Number, required: true },
  deck: { type: [deckSchema], required: true },
});

const CTournamentModel = mongoose.model("CTournament", CTournamentSchema);
module.exports = CTournamentModel;
