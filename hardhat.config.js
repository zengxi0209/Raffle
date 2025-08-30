require("@nomicfoundation/hardhat-toolbox");
require("solidity-coverage");
require("dotenv").config(); //可放在括号内指定路径{ path: './.env'}
require("hardhat-abi-exporter");
require("hardhat-gas-reporter");
require("@nomicfoundation/hardhat-verify");
// require("@nomicfoundation/hardhat-ignition"); // 添加这行

/** @type import('hardhat/config').HardhatUserConfig */
const { PRIVATE_KEYS1, ALCHEMY_API_KEY, SEPOLIA_ETHERSCAN_API_KEY } =
  process.env;

module.exports = {
  solidity: "0.8.28",
  networks: {
    localhost: {
      chainId: 31337,
      url: "http://127.0.0.1:8545",
    },
    eth_testnet: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [PRIVATE_KEYS1],
      chainId: 11155111, // 明确指定 chainId
    },
  },
  etherscan: {
    apiKey: SEPOLIA_ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "eth_testnet",
        chainId: 11155111, // Sepolia 的 chainId
        urls: {
          apiURL: "https://api-sepolia.etherscan.io/api",
          browserURL: "https://sepolia.etherscan.io",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
  abiExporter: {
    path: "./abi", // ABI 输出目录（默认：`./abi`）
    // runOnCompile: true,      // 编译时自动导出（默认：`false`）
    clear: true, // 每次编译前清空目录（默认：`false`）
    flat: true, // 扁平化结构（不按合约目录嵌套）
    // only: [":Lock$"],        // 仅导出匹配的合约（正则表达式，可选）
    // except: [":Mock.*"],     // 排除匹配的合约（正则表达式，可选）
    spacing: 2, // JSON 缩进空格数（默认：`2`）
    // pretty: true,            // 格式化 JSON 输出（默认：`false`）
  },
  gasReporter: {
    enabled: false,
    currency: "USD",
  },
};
