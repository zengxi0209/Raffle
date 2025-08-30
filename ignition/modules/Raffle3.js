const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require("hardhat");
const {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../../helper-hardhat-config");

module.exports = buildModule("RaffleModule", (m) => {
  const chainId = network.config.chainId;
  const vrfCoordinatorV2 = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const subscriptionId = 1;
  const raffle = m.contract("Raffle", [
    subscriptionId,
    networkConfig[chainId]["interval"],
    networkConfig[chainId]["gasLane"],
    networkConfig[chainId]["entranceFee"],
    networkConfig[chainId]["callbackGasLimit"],
    vrfCoordinatorV2,
  ]);

  return { raffle };
});
