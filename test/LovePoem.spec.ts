import { ethers, getNamedAccounts, network, deployments } from "hardhat";
import { assert, expect } from "chai";
import {
  LovePoem,
  LovePoem__factory,
  VRFCoordinatorV2Mock,
  VRFCoordinatorV2Mock__factory,
  VRFv2Consumer,
  VRFv2Consumer__factory,
} from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { developmentChains } from "../helper-hardhat-config";
import { ContractReceipt } from "ethers";

enum RequestPurpose {
  Mint,
}
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("LovePoem Unit Tests", async function () {
      let LovePoemContract: LovePoem;
      let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
      let VRFv2ConsumerContract: VRFv2Consumer;
      let owner: SignerWithAddress;
      let nonOwner: SignerWithAddress;

      beforeEach(async () => {
        const { deployer, user } = await getNamedAccounts();
        owner = await ethers.getSigner(deployer);
        nonOwner = await ethers.getSigner(user);

        const { address: lovePoemAddr } = await deployments.get("LovePoem");
        const { address: consumerAddr } =
          await deployments.get("VRFv2Consumer");
        const { address: coordinatorAddr } = await deployments.get(
          "VRFCoordinatorV2Mock",
        );
        LovePoemContract = LovePoem__factory.connect(lovePoemAddr, owner);
        VRFv2ConsumerContract = VRFv2Consumer__factory.connect(
          consumerAddr,
          owner,
        );
        vrfCoordinatorV2Mock = VRFCoordinatorV2Mock__factory.connect(
          coordinatorAddr,
          owner,
        );
      });
      it("Should get random number from VRF", async () => {
        const fundSubscription = await vrfCoordinatorV2Mock.fundSubscription(
          1,
          ethers.utils.parseEther("100000000"),
        );
        await fundSubscription.wait();

        const currPoemPrice = await ethers.utils.parseEther("1");
        const reqPurpose = RequestPurpose.Mint;
        const request = await VRFv2ConsumerContract.mintNewPoem(
          currPoemPrice,
          reqPurpose,
          {
            value: currPoemPrice,
          },
        );

        const requestReceipt: ContractReceipt = await request.wait();
        const event = requestReceipt.events?.findLast(
          (event) => event.event === "RequestSent",
        );
        const requestId = event?.args?.requestId;
        const fulfilled = await vrfCoordinatorV2Mock.fulfillRandomWords(
          requestId,
          VRFv2ConsumerContract.address,

          {
            gasLimit: 3000000,
          },
        );
        fulfilled.wait();
        console.log("fulfilled: ", fulfilled);

        console.log("requestId: ", requestId);
        const fulfilledReq = await VRFv2ConsumerContract.s_requests(requestId);
        console.log("fulfilledReq: ", fulfilledReq);
      });
      it("Should mint a LovePoem", async () => {
        await LovePoemContract.preparePoemToMint(owner.address, [0, 0, 0, 0]);
      });

      it("Should fail to mint a LovePoem", async () => {
        const testLovePoem = await LovePoemContract.poems(1);
        console.log("testLovePoem: ", testLovePoem);
      });
    });
