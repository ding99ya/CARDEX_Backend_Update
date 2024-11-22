const mongoose = require("mongoose");

const historyScoreSchema = new mongoose.Schema({
  time: { type: String, required: true },
  score: { type: Number, required: true },
});

const cardHistoryScoreSchema = new mongoose.Schema({
  uniqueId: { type: String, required: true, unique: true },
  historyScore: { type: [historyScoreSchema], required: true },
});

const CardHistoryScoreModel = mongoose.model(
  "cardHistoryScore",
  cardHistoryScoreSchema
);
module.exports = CardHistoryScoreModel;
