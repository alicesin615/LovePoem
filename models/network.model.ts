import { BigNumber } from "ethers";

export type NetworkConfigItem = {
  name: string;
  fundAmount: BigNumber;
  fee?: string;
  keyHash?: string;
  interval?: string;
  linkToken?: string;
  vrfCoordinator?: string;
  keepersUpdateInterval?: string;
  oracle?: string;
  jobId?: string;
  ethUsdPriceFeed?: string;
  tablelandBaseURI?: string;
  mainTablePrefix?: string;
  attributesTablePrefix?: string;
};

export type NetworkConfigMap = {
  [chainId: string]: NetworkConfigItem;
};
