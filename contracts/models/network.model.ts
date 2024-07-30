type CommonLocalConfig = {
  baseFee?: string;
  gasPriceLink?: string;
  weiPerUnitLink?: string;
};
export type NetworkConfigItem = Partial<CommonLocalConfig> & {
  name: string;
  keyHash: string;
  linkToken?: string;
  vrfCoordinator?: string;
  tablelandBaseURI?: string;
  mainTablePrefix?: string;
  attributesTablePrefix?: string;
};

export type NetworkConfigMap = {
  [chainId: string]: NetworkConfigItem;
};
