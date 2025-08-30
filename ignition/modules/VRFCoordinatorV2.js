const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const BASE_FEE = ethers.parseEther("0.25"); //基础费
const GAS_PRICE = 1e9; //gas单价
const WEI_PER_UNIT_LINK = 4e15; //link-eth汇率
module.exports = buildModule("RaffleModule", (m) => {
  const baseFee = m.getParameter("baseFee", BASE_FEE);
  const gasPrice = m.getParameter("gasPrice", GAS_PRICE);
  const weiPerUnitLink = m.getParameter("weiPerUnitLink", WEI_PER_UNIT_LINK);
  const vrfCoordinatorV2_5Mock = m.contract("VRFCoordinatorV2_5Mock", [
    baseFee,
    gasPrice,
    weiPerUnitLink,
  ]);

  return { vrfCoordinatorV2_5Mock };
});
