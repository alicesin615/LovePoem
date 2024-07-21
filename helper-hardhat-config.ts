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
    gasPriceLink: "1000000000",
    name: "hardhat",
    linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    baseFee: "100000000000000000",
    weiPerUnitLink: "4035249379403102",
    keyHash:
      "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    tablelandBaseURI: formatBaseURI(localTablelandBaseURI),
  },
  31337: {
    gasPriceLink: "1000000000",
    name: "localhost",
    linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    baseFee: "100000000000000000",
    weiPerUnitLink: "4035249379403102",
    keyHash:
      "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    tablelandBaseURI: formatBaseURI(localTablelandBaseURI),
    mainTablePrefix: "love_poem_main",
    attributesTablePrefix: "love_poem_attributes",
  },
  11155111: {
    name: "sepolia",
    linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    baseFee: "100000000000000000",
    weiPerUnitLink: "4035249379403102",
    vrfCoordinator: "0x8103B0A8A00be2DDC778e6e7eaaB76FF08963d2c",
    keyHash:
      "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
  },
};

export const developmentChains: string[] = ["hardhat", "localhost", "sepolia"];
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
