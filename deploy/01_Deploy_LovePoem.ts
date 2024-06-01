import { DeployFunction } from "hardhat-deploy/types";
import { getNamedAccounts, deployments, network } from "hardhat";

const deployFunction: DeployFunction = async () => {
  const DECIMALS: string = `18`;
  const INITIAL_PRICE: string = `200000000000000000000`;

  const BASE_FEE = "100000000000000000";
  const GAS_PRICE_LINK = "1000000000"; // 0.000000001 LINK per gas

  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId: number | undefined = network.config.chainId;

  if (chainId === 31337) {
    log(`Local network detected! Deploying contracts...with `);
    const baseURI = process.env.PINATA_BASE_URI;

    const VRFCoordinatorV2Mock = await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args: [BASE_FEE, GAS_PRICE_LINK],
    });

    const vrfCoordinatorV2MockAddress = VRFCoordinatorV2Mock.address;
    const vrfV2Consumer = await deploy(`VRFv2Consumer`, {
      contract: `VRFv2Consumer`,
      from: deployer,
      log: true,
      args: [vrfCoordinatorV2MockAddress],
      gasLimit: 6721975,
    });

    await deploy("LovePoemLib", {
      contract: "LovePoemLib",
      from: deployer,
      log: true,
      args: [],
    });

    const vrfV2ConsumerAddress = vrfV2Consumer.address;

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
