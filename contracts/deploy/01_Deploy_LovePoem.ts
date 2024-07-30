import { DeployFunction } from "hardhat-deploy/types";
import { getNamedAccounts, deployments, network } from "hardhat";

const deployFunction: DeployFunction = async () => {
  const DECIMALS: string = `18`;
  const INITIAL_PRICE: string = `200000000000000000000`;

  const BASE_FEE = "100000000000000000";
  const GAS_PRICE_LINK = "1000000000"; // 0.000000001 LINK per gas

  // Sepolia
  const VRFCOORDINATOR = "0x8103b0a8a00be2ddc778e6e7eaa21791cd364625";
  const LINKTOKEN = "0x779877a7b0d9e8603169ddbd7836e478b4624789";
  const KEYHASH =
    "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
  const CALLBACK_GAS_LIMIT = 100000;
  const NUM_WORDS = 2;

  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId: number | undefined = network.config.chainId;

  if (chainId === 31337) {
    log(`Local network detected! Deploying contracts...with `);
    const baseURI = process.env.PINATA_BASE_URI;

    if (!baseURI) {
      log(`Please set PINATA_BASE_URI in the .env file`);
      process.exit(1);
    }

    await deploy(`VRFv2Consumer`, {
      contract: `VRFv2Consumer`,
      from: deployer,
      log: true,
      args: [
        VRFCOORDINATOR,
        LINKTOKEN,
        KEYHASH,
        3,
        CALLBACK_GAS_LIMIT,
        NUM_WORDS,
      ],
      gasLimit: 6721975,
    });

    await deploy("LovePoem", {
      contract: "LovePoem",
      from: deployer,
      log: true,
      args: [baseURI],
    });

    log(`LovePoem Deployed!`);
    log(`----------------------------------------------------`);
    log(
      `You are deploying to a local network, you'll need a local network running to interact`,
    );
    log(
      "Please run `yarn hardhat console` to interact with the deployed smart contracts!",
    );
    log(`----------------------------------------------------`);
  }
};

export default deployFunction;
