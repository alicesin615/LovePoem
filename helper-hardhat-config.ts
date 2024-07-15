import { BigNumber } from "ethers";
import { baseURIs } from "@tableland/evm/network";
import { NetworkConfigMap } from "./models";

const localTablelandBaseURI = baseURIs?.[
  "localhost" || "local-tableland"
] as string;

/**
 * @description Remove `/tables/${chainId} from baseURI to get general base URI
 */
const formatBaseURI = (baseURI: string) => {
  return baseURI?.replace(/\/tables\/\d+\/$/, "");
};

export const networkConfig: NetworkConfigMap = {
  default: {
    name: "hardhat",
    fee: "100000000000000000",
    keyHash:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    jobId: "29fa9aa13bf1468788b7cc4a500a45b8",
    fundAmount: BigNumber.from("1000000000000000000"),
    keepersUpdateInterval: "30",
    tablelandBaseURI: formatBaseURI(localTablelandBaseURI),
  },
  31337: {
    name: "localhost",
    fee: "100000000000000000",
    keyHash:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    jobId: "29fa9aa13bf1468788b7cc4a500a45b8",
    fundAmount: BigNumber.from("1000000000000000000"),
    keepersUpdateInterval: "30",
    ethUsdPriceFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    tablelandBaseURI: formatBaseURI(localTablelandBaseURI),
    mainTablePrefix: "love_poem_main",
    attributesTablePrefix: "love_poem_attributes",
  },
};

export const developmentChains: string[] = ["hardhat", "localhost"];
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
