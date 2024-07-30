import dotenv from "dotenv";
import { extendEnvironment, subtask } from "hardhat/config";
import type {
  HardhatUserConfig,
  HardhatRuntimeEnvironment,
} from "hardhat/types";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import "@tableland/hardhat";
import "@tableland/evm";
import "@tableland/sdk";
import {
  TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS,
  TASK_TEST,
  TASK_TEST_RUN_MOCHA_TESTS,
} from "hardhat/builtin-tasks/task-names";

dotenv.config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
const ALCHEMY_POLYGON_AMOY_API_KEY = process.env.ALCHEMY_POLYGON_AMOY_API_KEY;

// exclude **.ignore.sol from compilation
subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS || TASK_TEST).setAction(
  async (_, __, runSuper) => {
    const paths = await runSuper();
    return paths.filter((p: any) => !p.includes("ignore"));
  },
);

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.23",
      },
      {
        version: "0.8.22",
      },
      {
        version: "0.8.19",
      },
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: "hardhat",
  localTableland: {
    silent: false,
    verbose: false,
  },
  networks: {
    hardhat: {
      chainId: 31337,
      forking: {
        url: SEPOLIA_RPC_URL !== undefined ? SEPOLIA_RPC_URL : "",
        enabled: false,
      },
      // tags: ["test", "local"],
      loggingEnabled: true,
      allowUnlimitedContractSize: true,
      gas: "auto",
      gasPrice: "auto",
    },
    localhost: {
      chainId: 31337,
      allowUnlimitedContractSize: true,
      gas: "auto",
      gasPrice: "auto",
    },
    sepolia: {
      url: SEPOLIA_RPC_URL !== undefined ? SEPOLIA_RPC_URL : "",
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    "polygon-amoy": {
      url: `https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_POLYGON_AMOY_API_KEY}`,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: POLYGONSCAN_API_KEY,
    customChains: [
      {
        network: "polygon-amoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
    ],
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
  },
  config: {
    args: {
      contractAddress: "", // IMPORTANT: Update this with your contract deployment address
      linkTokenAddress: "0x779877A7B0D9E8603169DdbD7836e478b4624789", // Ethereum Sepolia LINK token
      oracleAddress: "0x6090149792dAAeE9D1D568c9f9a6F6B46AA29eFD", // Any API node operator address
      jobId: "ca98366cc7314957b8c012c72f05aeeb",
    },
  },

  typechain: {
    outDir: "typechain-types",
    target: "ethers-v5",
  },
};

interface ContractConfig {
  contractAddress: string;
  linkTokenAddress: string;
  oracleAddress: string;
  jobId: string;
}

interface ContractNetworkConfig {
  args: ContractConfig;
}

declare module "hardhat/types/config.ts" {
  interface HardhatUserConfig {
    config: ContractNetworkConfig;
  }
}

declare module "hardhat/types/runtime.ts" {
  interface HardhatRuntimeEnvironment {
    deployment: ContractConfig;
  }
}

extendEnvironment((hre: HardhatRuntimeEnvironment) => {
  const config = hre.userConfig.config;
  hre.deployment = config.args;
});

export default config;
