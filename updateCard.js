const abi = require("./CardexV1.json");
const { Contract, providers, BigNumber } = require("ethers");
const ethers = require("ethers");

const mongoose = require("mongoose");
// const CardModel = require("./models/CardModel");
require("dotenv").config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Alchemy configuration to fetch info from blockchain and set up info
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const alchemyKey =
  "wss://base-sepolia.g.alchemy.com/v2/wMbCgZrHMGP75QlXkB6LtcKOKDb4BHfg";
const web3 = createAlchemyWeb3(alchemyKey);

// CardexV1 address on Base Sepolia
const CONTRACT_ADDR = "0x1141887622ae18a166c2Cc5F7abfb7a3E4ea85fE";

// CardexV1 contract instance
const contract = new web3.eth.Contract(abi, CONTRACT_ADDR);

// Define the card schema
const cardSchema = new mongoose.Schema({
  name: String,
  photo: String,
  uniqueId: { type: String, unique: true },
  ipoTime: String,
  price: Number,
  category: String,
  lastPrice: Number,
  trend: Number,
  shares: Number,
  initialSharesPrice: Number,
  ipoSharesPrice: Number,
  ipoShares: Number,
});

// Create the model
const Card = mongoose.model("Card", cardSchema);

// Define the price history schema
const priceHistorySchema = new mongoose.Schema({
  price: { type: Number, required: true },
  time: { type: Date, required: true },
});

// Define the prices schema
const pricesSchema = new mongoose.Schema({
  uniqueId: { type: String, required: true, unique: true },
  priceHistory: { type: [priceHistorySchema], required: true },
});

// Create the model for the prices collection
const prices = mongoose.model("prices", pricesSchema);

// Define the card inventory schema
const cardInventorySchema = new mongoose.Schema({
  uniqueId: { type: String, required: true },
  shares: { type: Number, required: true },
});

// Define the users schema
const usersSchema = new mongoose.Schema({
  DID: { type: String, required: true, unique: true },
  walletAddress: { type: String, required: true, unique: true },
  username: { type: String, required: false },
  invited: { type: Boolean, default: false },
  inviteCode: { type: String, required: false },
  cardInventory: { type: [cardInventorySchema], required: true },
});

// Create the model for the prices collection
const users = mongoose.model("users", usersSchema);

// Function to update the info for a specific card including latest price, trend and share holders
const updateCard = async (uniqueId, newPrice, newTrend, newShares) => {
  try {
    // find the card with specific uniqueId and then update it
    const updateResult = await Card.updateOne(
      { uniqueId: uniqueId },
      { $set: { price: newPrice, trend: newTrend, shares: newShares } }
    );

    console.log(`Card ${uniqueId} info updated`);
  } catch (err) {
    console.error(`Error updating Card ${uniqueId} info with error:  `, err);
  }
};

// Function to update or create a price history
const updateOrCreatePrice = async (uniqueId, newPrice, newTime) => {
  try {
    const existingDocument = await prices.findOne({ uniqueId });

    if (existingDocument) {
      // If the document exists, update the priceHistory
      existingDocument.priceHistory.push({ price: newPrice, time: newTime });

      // Check if priceHistory length exceeds 50
      if (existingDocument.priceHistory.length > 50) {
        // Remove excess elements from the beginning
        existingDocument.priceHistory.splice(
          0,
          existingDocument.priceHistory.length - 50
        );
      }

      await existingDocument.save();
      console.log(`Updated priceHistory for Card ${uniqueId}`);
    } else {
      // If the document does not exist, create a new one
      const newDocument = new prices({
        uniqueId,
        priceHistory: [{ price: newPrice, time: newTime }],
      });
      await newDocument.save();
      console.log(`priceHistory created for Card ${uniqueId}`);
    }
  } catch (err) {
    console.error(
      `Error updating or creating priceHistory for Card ${uniqueId} with error: `,
      err
    );
  }
};

// Function to update a user's card inventory when buy
const updateUsersWhenBuy = async (walletAddress, uniqueId, shares) => {
  try {
    // Find the user document corresponding to the walletAddress
    const user = await users.findOne({ walletAddress });

    if (!user) {
      // walletAddress doesn't exist in db but is buying, need to create a new record
      const newUser = new users({
        DID: "0",
        walletAddress: walletAddress,
        username: "BT",
        invited: false,
        inviteCode: "",
        cardInventory: [{ uniqueId: uniqueId, shares: shares }],
      });
      await newUser.save();
      console.log("User created successfully for Buy event: ", newUser);
    } else {
      // Find the card inventory corresponding to the uniqueId
      const cardIndex = user.cardInventory.findIndex(
        (card) => card.uniqueId === uniqueId
      );

      if (cardIndex === -1) {
        // If buying and card doesn't exist, add the new card to the inventory
        user.cardInventory.push({ uniqueId, shares });
        await user.save();
        console.log(
          `Added Card ${uniqueId} to user's ${walletAddress} inventory`
        );
      } else {
        // Increase users specific card shares
        user.cardInventory[cardIndex].shares = shares;

        // Save the updated user document
        await user.save();
        console.log(
          `Updated Card ${uniqueId} for user's ${walletAddress} inventory`
        );
      }
    }
  } catch (error) {
    console.error(
      `Error updating user's ${walletAddress} inventory for Card ${uniqueId} with error: `,
      error
    );
  }
};

// Function to update a user's card inventory when sell
const updateUsersWhenSell = async (walletAddress, uniqueId, shares) => {
  try {
    // Find the user document corresponding to the walletAddress
    const user = await users.findOne({ walletAddress });

    if (!user) {
      // walletAddress doesn't exist in db but is selling, need to create a new record
      const newUser = new users({
        DID: "0",
        walletAddress: walletAddress,
        username: "BT",
        invited: false,
        inviteCode: "",
        cardInventory: [{ uniqueId: uniqueId, shares: shares }],
      });
      await newUser.save();
      console.log("User created successfully for Sell event: ", newUser);
    } else {
      // Find the card inventory corresponding to the uniqueId
      const cardIndex = user.cardInventory.findIndex(
        (card) => card.uniqueId === uniqueId
      );

      if (cardIndex === -1) {
        // If selling and card doesn't exist, add the new card to the inventory
        user.cardInventory.push({ uniqueId, shares });
        await user.save();
        console.log(
          `Added Card ${uniqueId} to user's ${walletAddress} inventory`
        );
      } else {
        // Decrease users specific card shares
        user.cardInventory[cardIndex].shares = shares;

        if (user.cardInventory[cardIndex].shares === 0) {
          user.cardInventory.splice(cardIndex, 1);
          console.log(
            `Removed Card ${uniqueId} from user's ${walletAddress} inventory as shares dropped to 0`
          );
        }

        // Save the updated user document
        await user.save();
        console.log(
          `Updated Card ${uniqueId} for user's ${walletAddress} inventory`
        );
      }
    }
  } catch (error) {
    console.error(
      `Error updating user's ${walletAddress} inventory for Card ${uniqueId} with error: `,
      error
    );
  }
};

// Function to fetch current card share price from blockchain
const loadCurrentPrice = async (id) => {
  const initialPrice = await contract.methods.getBuyPrice(id, 1).call();
  return initialPrice.toString();
};

// Function to load current shares being bought for a specific card
const loadShareHolders = async (id) => {
  const shareHolders = await contract.methods.boughtShares(id).call();
  return shareHolders.toString();
};

// Function to fetch user's current shares from blockchain
const loadUserShares = async (id, address) => {
  const userShares = await contract.methods.sharesBalance(id, address).call();
  return userShares.toString();
};

// Function to transfer current price to a format with 3 decimals (X.XXX ETH)
const getPrice = async (id) => {
  const price = await loadCurrentPrice(id);
  console.log(price);
  // const priceToBigNumber = ethers.BigNumber.from(price);
  const priceToBigNumber = web3.utils.toBN(price.toString());
  // const oneEther = ethers.BigNumber.from("1000000000000000000");
  const oneEther = web3.utils.toBN("1000000000000000000");
  const priceInETH =
    Number(priceToBigNumber.mul(web3.utils.toBN(10000)).div(oneEther)) / 10000;

  return priceInETH;
};

// Function to get shares being bought
const getHolders = async (id) => {
  const holders = await loadShareHolders(id);
  return holders;
};

// Function to get Up/Down trend of a card in percentage compared to the price from last day
const getTrend = (currentPrice, lastPrice) => {
  const priceTrend = (((currentPrice - lastPrice) / lastPrice) * 100).toFixed(
    2
  );
  return Number(priceTrend).toFixed(2);
};

// function to add listener to Buy() event onchain so that Buy() event can trigger update for cards, prices and users
function addBuyListener() {
  console.log("Buy Listener Started");
  contract.events.Buy({}, async (error, data) => {
    if (error) {
      console.log(`Error when listening to Buy event: `, error);
    } else {
      try {
        const cardID = data.returnValues[0];

        const buyer = data.returnValues[1];

        const currentPrice = await getPrice(Number(cardID));

        const currentShareHolders = await getHolders(Number(cardID));

        const card = await Card.findOne(
          { uniqueId: cardID.toString() },
          "lastPrice"
        );

        const currentTrend = getTrend(
          Number(currentPrice),
          Number(card.lastPrice)
        );

        updateCard(
          cardID.toString(),
          Number(currentPrice),
          currentTrend,
          Number(currentShareHolders)
        );

        const currentTime = new Date();

        updateOrCreatePrice(
          cardID.toString(),
          Number(currentPrice),
          currentTime
        );

        const currentBuyerShares = await loadUserShares(Number(cardID), buyer);

        updateUsersWhenBuy(
          buyer.toString(),
          cardID.toString(),
          Number(currentBuyerShares)
        );
      } catch (error) {
        console.log(
          `Error when listening to Buy event and try to update: `,
          error
        );
      }
    }
  });
}

// function to add listener to Sell() event onchain so that Sell() event can trigger update for cards, prices and users
function addSellListener() {
  console.log("Sell Listener Started");
  contract.events.Sell({}, async (error, data) => {
    if (error) {
      console.log(`Error when listening to Sell event: `, error);
    } else {
      try {
        const cardID = data.returnValues[0];

        const seller = data.returnValues[1];

        const currentPrice = await getPrice(Number(cardID.toString()));

        const currentShareHolders = await getHolders(Number(cardID.toString()));

        const card = await Card.findOne(
          { uniqueId: cardID.toString() },
          "lastPrice"
        );

        const currentTrend = getTrend(
          Number(currentPrice),
          Number(card.lastPrice)
        );

        updateCard(
          cardID.toString(),
          Number(currentPrice),
          currentTrend,
          Number(currentShareHolders)
        );

        const currentTime = new Date();

        updateOrCreatePrice(cardID.toString(), currentPrice, currentTime);

        const currentSellerShares = await loadUserShares(
          Number(cardID),
          seller
        );

        updateUsersWhenSell(
          seller.toString(),
          cardID.toString(),
          Number(currentSellerShares)
        );
      } catch (error) {
        console.log(
          `Error when listening to Sell event and try to update: `,
          error
        );
      }
    }
  });
}

addBuyListener();
addSellListener();

// TODO: Need to also create card and update/create user inventory for IPOCard event
// TODO: Need to update lastPrice every 24 hours, maybe in other script
