const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { network, ethers } = require("hardhat");

module.exports = buildModule("RaffleModule", (m) => {
  const raffle = m.contract("Raffle", [
    1,
    30,
    "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    ethers.parseEther("0.01"),
    500000,
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  ]);

  return { raffle };
});
