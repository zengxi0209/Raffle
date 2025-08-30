const hre = require("hardhat");
const {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat-config");

let vrfCoordinatorV2, subscriptionId;
const FUND_AMOUNT = ethers.parseEther("1"); // 1 Ether, or 1e18 (10^18) Wei

async function main() {
  const chainId = hre.network.config.chainId;
  if (!networkConfig[chainId]) {
    throw new Error(`No config for chainId ${chainId}`);
  }
  console.log(chainId);
  if (chainId == 31337) {
    const BASE_FEE = ethers.parseEther("0.25"); //基础费
    const GAS_PRICE = 1e9; //gas单价
    const WEI_PER_UNIT_LINK = 4e15; //link-eth汇率
    // 获取合约工厂
    const VRFCoordinatorV2_5Mock = await hre.ethers.getContractFactory(
      "VRFCoordinatorV2_5Mock"
    );
    // 部署合约
    const vrfCoordinatorV2_5Mock = await VRFCoordinatorV2_5Mock.deploy(
      BASE_FEE,
      GAS_PRICE,
      WEI_PER_UNIT_LINK
    );

    console.log(
      "VRFCoordinatorV2_5Mock Contract deployed to:",
      vrfCoordinatorV2_5Mock.target
    );
    vrfCoordinatorV2 = vrfCoordinatorV2_5Mock.target;
    const transactionResponse =
      await vrfCoordinatorV2_5Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait();
    // subscriptionId = transactionReceipt.events[0].args.subId;
    const event = transactionReceipt.logs
      .map((log) => {
        try {
          return vrfCoordinatorV2_5Mock.interface.parseLog(log);
        } catch (e) {
          return null; // 忽略无法解析的日志
        }
      })
      .find((e) => e?.name === "SubscriptionCreated"); // 根据事件名过滤

    if (!event) {
      throw new Error("SubscriptionCreated event not found");
    }

    subscriptionId = event.args.subId; // 获取 subId
    // Fund the subscription
    // Our mock makes it so we don't actually have to worry about sending fund
    await vrfCoordinatorV2_5Mock.fundSubscription(subscriptionId, FUND_AMOUNT);
  } else {
    vrfCoordinatorV2 = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }
  const waitBlockConfirmations = developmentChains.includes(network.name)
    ? 1
    : VERIFICATION_BLOCK_CONFIRMATIONS;
  console.log("----------------------------------------------------");
  const arguments = [
    subscriptionId,
    networkConfig[chainId]["interval"],
    networkConfig[chainId]["gasLane"],
    networkConfig[chainId]["entranceFee"],
    networkConfig[chainId]["callbackGasLimit"],
    vrfCoordinatorV2,
  ];
  // 获取合约工厂
  const Raffle = await hre.ethers.getContractFactory("Raffle");
  // 部署合约
  const raffle = await Raffle.deploy(...arguments);
  await raffle.waitForDeployment({
    confirmations: waitBlockConfirmations, // 例如 1（本地链）或 6（主网）
  }); // 等待部署完成
  console.log("Raffle Contract deployed to:", raffle.target);
  // Ensure the Raffle contract is a valid consumer of the VRFCoordinatorV2Mock contract.
  if (developmentChains.includes(network.name)) {
    const vrfCoordinatorV2_5Mock = await hre.ethers.getContractAt(
      "VRFCoordinatorV2_5Mock",
      vrfCoordinatorV2
    );
    await vrfCoordinatorV2_5Mock.addConsumer(subscriptionId, raffle.target);
  }
  console.log("Enter lottery with command:");
  const networkName = network.name == "hardhat" ? "localhost" : network.name;
  console.log(
    `npx hardhat run scripts/enterRaffle.js --network ${networkName}`
  );
  console.log("----------------------------------------------------");
}

// 执行主函数
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
