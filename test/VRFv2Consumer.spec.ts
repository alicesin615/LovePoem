import { assert, expect } from "chai";
import { ethers, getNamedAccounts } from "hardhat";
import {
  LovePoem,
  LovePoem__factory,
  VRFv2Consumer,
  VRFv2Consumer__factory,
  VRFCoordinatorV2Interface,
} from "../typechain-types";
import { network, deployments } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { developmentChains } from "../helper-hardhat-config";
import VRFCoordinatorAbi from "../test/VRFCoordinatorAbi.json";
enum RequestPurpose {
  Mint,
}
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("VRFv2Consumer Unit Tests", async function () {
      let VRFv2ConsumerContract: VRFv2Consumer;
      let VRFCoordinatorContract: VRFCoordinatorV2Interface;
      let LovePoemContract: LovePoem;

      let owner: SignerWithAddress;
      let nonOwner: SignerWithAddress;

      const VRFCoordinatorAddr = "0x8103b0a8a00be2ddc778e6e7eaa21791cd364625";

      beforeEach(async () => {
        const { deployer, user } = await getNamedAccounts();
        const { address: consumerAddr } =
          await deployments.get("VRFv2Consumer");
        const { address: lovePoemAddr } = await deployments.get("LovePoem");

        owner = await ethers.getSigner(deployer);
        nonOwner = await ethers.getSigner(user);

        VRFv2ConsumerContract = VRFv2Consumer__factory.connect(
          consumerAddr,
          owner,
        );
        LovePoemContract = LovePoem__factory.connect(lovePoemAddr, owner);

        const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
        const PRIVATE_KEY = process.env.PRIVATE_KEY!;
        const provider = new ethers.providers.JsonRpcProvider(
          SEPOLIA_RPC_URL,
          "sepolia",
        );
        const signer = new ethers.Wallet(PRIVATE_KEY, provider);
        VRFCoordinatorContract = new ethers.Contract(
          VRFCoordinatorAddr,
          VRFCoordinatorAbi,
          signer,
        ) as VRFCoordinatorV2Interface;
      });
      it("Should deploy VRFv2Consumer, LovePoem locally & fork VRFCoordinatorV2 from Sepolia", async () => {
        console.log(
          "VRFv2Consumer contract address (local): ",
          VRFv2ConsumerContract.address,
        );
        console.log(
          "LovePoem contract address (local): ",
          LovePoemContract.address,
        );
        console.log(
          "VRFCoordinatorContract address (Sepolia fork instance in hardhat): ",
          VRFCoordinatorContract.address,
        );
      });
      it("Should register VRFConsumer instance on LovePoem contract", async () => {
        const registerVRFConsumer = await LovePoemContract.registerVRFConsumer(
          VRFv2ConsumerContract.address,
        );
        const registerVRFConsumerReceipt = await registerVRFConsumer.wait();
        const event = registerVRFConsumerReceipt.events?.findLast(
          (event) => event.event === "VRFConsumerRegistered",
        );
        console.log("registerVRFConsumerEvent: ", event);
      });
      it("Should request for random numbers via VRFv2Consumer", async () => {
        const requestRandomness = await LovePoemContract.requestRandomness(
          RequestPurpose.Mint,
        );
        const requestRandomnessReceipt = await requestRandomness.wait();
        const event = requestRandomnessReceipt.events?.findLast(
          (event) => event.event === "RequestSent",
        );
        const requestId = event?.args?.requestId;
        console.log("requestRandomnessReceipt: ", requestRandomnessReceipt);
      });
      it("Should get random numbers from VRF & mint a LovePoem (simulation)", async () => {
        const requestStatus = await LovePoemContract.preparePoemToMint(
          owner.address,
          [
            "1234567890123456789012345678901234567890123456789012345678901234",
            "2345678901234567890123456789012345678901234567890123456789012345",
            "3456789012345678901234567890123456789012345678901234567890123456",
          ],
        );
        const requestStatusReceipt = await requestStatus.wait();
        console.log("requestStatusReceipt: ", requestStatusReceipt);
        const event = requestStatusReceipt.events?.findLast(
          (event) => event.event === "RequestSent",
        );
        const requestId = event?.args?.requestId;
        console.log("requestId: ", requestId);
      });
      it("Should get poem info via poemId of minted LovePoem", async () => {
        const poemInfo = await LovePoemContract.getPoemInfo(1);
        console.log("poemInfo: ", poemInfo);
      });
    });
