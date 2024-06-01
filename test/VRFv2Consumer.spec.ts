import { assert, expect } from "chai";
import { ethers, getNamedAccounts } from "hardhat";
import {
  VRFCoordinatorV2Mock,
  VRFCoordinatorV2Mock__factory,
  VRFv2Consumer,
} from "../typechain-types";
import { network, deployments } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { developmentChains } from "../helper-hardhat-config";
import { BigNumber, ContractReceipt } from "ethers";
import { VRFv2Consumer__factory } from "../typechain-types";
enum RequestPurpose {
  Mint,
}
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("VRFv2Consumer Unit Tests", async function () {
      let VRFv2ConsumerContract: VRFv2Consumer;
      let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
      let owner: SignerWithAddress;
      let nonOwner: SignerWithAddress;

      beforeEach(async () => {
        const { deployer, user } = await getNamedAccounts();
        const { address: consumerAddr } =
          await deployments.get("VRFv2Consumer");
        const { address: coordinatorAddr } = await deployments.get(
          "VRFCoordinatorV2Mock",
        );

        owner = await ethers.getSigner(deployer);
        nonOwner = await ethers.getSigner(user);

        VRFv2ConsumerContract = VRFv2Consumer__factory.connect(
          consumerAddr,
          owner,
        );
        vrfCoordinatorV2Mock = VRFCoordinatorV2Mock__factory.connect(
          coordinatorAddr,
          owner,
        );
      });
      it("Should sucessfully fund a subscription", async () => {
        await vrfCoordinatorV2Mock.fundSubscription(1, 10000);
      });
      it("Should successfully request a random number and get a result", async () => {
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
        console.log("requestId: ", requestId);

        await expect(
          vrfCoordinatorV2Mock.fulfillRandomWords(
            requestId,
            VRFv2ConsumerContract.address,
            {
              gasLimit: 3000000,
            },
          ),
        ).to.emit(vrfCoordinatorV2Mock, "RandomWordsFulfilled");
      });
    });
