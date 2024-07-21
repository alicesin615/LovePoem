import hre, { network, ethers } from "hardhat";
import { BigNumber, Signer } from "ethers";
import { expect } from "chai";
import { networkConfig } from "../../helper-hardhat-config";
import { describe, it } from "mocha";
import {
  VRFCoordinatorV2_5Mock,
  VRFCoordinatorV2_5Mock__factory,
  VRFSubscriptionConsumer,
  VRFSubscriptionConsumer__factory,
} from "../../typechain-types";

describe("VRFSubscriptionConsumer Unit Tests", async function () {
  // const subscriptionId = process.env.VRF_SUBSCRIPTION_ID!!;

  // network-specific configs
  const chainId = network.config.chainId!!;
  const chosenNetworkConfig = networkConfig?.[chainId];
  const {
    keyHash,
    vrfCoordinator: testnetVrfCoordinator,
    baseFee,
    gasPriceLink,
    weiPerUnitLink,
  } = chosenNetworkConfig || {};

  // adjustable configs depending on needs
  const requestConfirmations = 3;
  const callbackGasLimit = 100000;
  const numWords = 3;

  let deployer: Signer;
  let subscriptionId: BigNumber;
  let VRFCoordinatorFactory: VRFCoordinatorV2_5Mock__factory;
  let vrfCoordinatorMock: VRFCoordinatorV2_5Mock;
  let vrfCoordinatorAddr: string;
  let VRFSubscriptionConsumerFactory: VRFSubscriptionConsumer__factory;
  let vrfSubscriptionConsumer: VRFSubscriptionConsumer;
  let vrfSubscriptionConsumerAddr: string;

  this.beforeAll(async () => {
    // For LOCAL TESTING: Deploy Mock VRF Coordinator Contract
    if (network?.name === "hardhat" || network?.name === "localhost") {
      [deployer] = await hre.ethers.getSigners();
      VRFCoordinatorFactory = (await hre.ethers.getContractFactory(
        "VRFCoordinatorV2_5Mock",
      )) as VRFCoordinatorV2_5Mock__factory;

      VRFCoordinatorFactory.connect(deployer);

      vrfCoordinatorMock = await VRFCoordinatorFactory.deploy(
        BigNumber.from(baseFee!!),
        BigNumber.from(gasPriceLink!!),
        BigNumber.from(weiPerUnitLink!!),
      );
      await vrfCoordinatorMock.deployed();
      vrfCoordinatorAddr = vrfCoordinatorMock.address;
      console.log(
        "VRFCoordinatorV2Mock deployed at: ",
        vrfCoordinatorMock.address,
      );
      const createSubscriptionReceipt = (
        await vrfCoordinatorMock.createSubscription()
      ).wait();
      // console.log(
      //   "Create Subscription Receipt: ",
      //   await createSubscriptionReceipt,
      // );
      subscriptionId = (await createSubscriptionReceipt).events?.find(
        (e) => e.event === "SubscriptionCreated",
      )?.args?.subId?._hex; //_hex or _isBigNumber
    } else {
      subscriptionId = BigNumber.from(process.env.SUBSCRIPTION_ID!!);
      vrfCoordinatorAddr = testnetVrfCoordinator!!;
    }

    console.log("subscriptionId: ", subscriptionId, typeof subscriptionId);
    // Deploy Consumer Contract
    VRFSubscriptionConsumerFactory = (await hre.ethers.getContractFactory(
      "VRFSubscriptionConsumer",
    )) as VRFSubscriptionConsumer__factory;

    VRFSubscriptionConsumerFactory.connect(deployer);
    console.log("VRFCoordinatorV2_5Mock deployed to: ", vrfCoordinatorAddr);
    vrfSubscriptionConsumer = await VRFSubscriptionConsumerFactory.deploy(
      vrfCoordinatorAddr,
      subscriptionId,
      keyHash!!,
      requestConfirmations,
      callbackGasLimit,
      numWords,
    );
    await vrfSubscriptionConsumer.deployed();
    console.log(
      "VRFSubscriptionConsumer deployed to: ",
      vrfSubscriptionConsumer.address,
    );
    vrfSubscriptionConsumerAddr = vrfSubscriptionConsumer.address;
  });
  it("Should add VRFSubscriptionConsumer as consumer", async function () {
    const addConsumerReceipt = (
      await vrfCoordinatorMock.addConsumer(
        subscriptionId,
        vrfSubscriptionConsumerAddr,
      )
    ).wait();
    const addedConsumer = (await addConsumerReceipt).events?.some((e) => {
      return e?.event === "SubscriptionConsumerAdded";
    });
    expect(addedConsumer).to.be.equal(true);
  });
  it("Should fund subscription", async function () {
    const fundSubscriptionReceipt = (
      await vrfCoordinatorMock.fundSubscription(
        subscriptionId,
        ethers.utils.parseEther("3000000000000000000"),
      )
    ).wait();
    const funded = (await fundSubscriptionReceipt).events?.some((e) => {
      return e?.event === "SubscriptionFunded";
    });
    expect(funded).to.be.equal(true);
  });
});
