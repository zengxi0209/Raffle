const { ethers } = require("hardhat");
const networkConfig = {
  11155111: {
    name: "sepolia",
    vrfCoordinatorV2: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
    entranceFee: ethers.parseEther("0.01"),
    gasLane:
      "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    interval: 30,
    subscriptionId:
      "31843849780285306552110138266167796600029884548246114513961819388527330637199",
    callbackGasLimit: 500000,
  },
  31337: {
    name: "hardhat",
    entranceFee: ethers.parseEther("0.01"),
    gasLane:
      "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    interval: 30,
    callbackGasLimit: 500000,
  },
};
const developmentChains = ["hardhat", "localhost"];
const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
module.exports = {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
};
