const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { network, ethers } = require("hardhat");
const {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../../helper-hardhat-config");
const BASE_FEE = ethers.parseEther("0.25"); //基础费
const GAS_PRICE = 1e9; //gas单价
const WEI_PER_UNIT_LINK = 4e15; //link-eth汇率

const FUND_AMOUNT = ethers.parseEther("1"); // 1 Ether, or 1e18 (10^18) Wei
module.exports = buildModule("RaffleModule", (m) => {
  const chainId = network.config.chainId;
  let vrfCoordinatorV2, subscriptionId;
  if (!networkConfig[chainId]) {
    throw new Error(`No config for chainId ${chainId}`);
  }
  console.log(chainId);
  if (chainId == 31337) {
    const baseFee = m.getParameter("baseFee", BASE_FEE);
    const gasPrice = m.getParameter("gasPrice", GAS_PRICE);
    const weiPerUnitLink = m.getParameter("weiPerUnitLink", WEI_PER_UNIT_LINK);
    const vrfCoordinatorV2_5Mock = m.contract("VRFCoordinatorV2_5Mock", [
      baseFee,
      gasPrice,
      weiPerUnitLink,
    ]);
    // vrfCoordinatorV2 = vrfCoordinatorV2_5Mock.target;
    // console.log(
    //   "VRFCoordinatorV2_5Mock contract deployed to:",
    //   vrfCoordinatorV2
    // );此时未部署，解读为VRFCoordinatorV2_5Mock contract deployed to: undefined
    //   }
    console.log(
      "VRFCoordinatorV2_5Mock contract deployed to:",
      vrfCoordinatorV2_5Mock
    );

    // subscriptionId = 1;
    // subscriptionId = m.call(vrfCoordinatorV2, "createSubscription");
    // 1. 创建订阅
    const createSubTx = m.call(vrfCoordinatorV2_5Mock, "createSubscription");

    // 2. 从事件中解析subscriptionId
    const subscriptionId = m.readEventArgument(
      createSubTx, // 交易Future
      "SubscriptionCreated", // 事件名称
      "subId" // 参数名称
    );
    m.call(
      vrfCoordinatorV2_5Mock,
      "fundSubscription",
      [subscriptionId, FUND_AMOUNT],
      {
        after: [createSubTx], // 明确执行顺序
      }
    );
    vrfCoordinatorV2 = vrfCoordinatorV2_5Mock;
  } else {
    vrfCoordinatorV2 = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }
  if (!vrfCoordinatorV2) {
    throw new Error("Missing vrfCoordinatorV2 address in network config");
  }
  const waitBlockConfirmations = developmentChains.includes(network.name)
    ? 1
    : VERIFICATION_BLOCK_CONFIRMATIONS;
  console.log("----------------------------------------------------");

  const raffle = m.contract(
    "Raffle",
    [
      subscriptionId,
      networkConfig[chainId]["interval"],
      networkConfig[chainId]["gasLane"],
      networkConfig[chainId]["entranceFee"],
      networkConfig[chainId]["callbackGasLimit"],
      vrfCoordinatorV2,
    ],
    {
      waitConfirmations: waitBlockConfirmations,
    }
  );
  console.log("Raffle contract deployed to:", raffle);
  // Ensure the Raffle contract is a valid consumer of the VRFCoordinatorV2Mock contract.
  if (developmentChains.includes(network.name)) {
    m.call(vrfCoordinatorV2, "addConsumer", [subscriptionId, raffle], {
      after: [raffle], // 等待Raffle部署完成
    });
  }
  console.log("Enter lottery with command:");
  const networkName = network.name == "hardhat" ? "localhost" : network.name;
  console.log(
    `npx hardhat run scripts/enterRaffle.js --network ${networkName}`
  );
  console.log("----------------------------------------------------");
  return {
    vrfCoordinatorV2,
    raffle,
  };
});
