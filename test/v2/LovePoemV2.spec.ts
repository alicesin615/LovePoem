import hre, { network, ethers } from "hardhat";
import { expect } from "chai";
import { describe, it } from "mocha";
import { getAccounts, getDatabase } from "@tableland/local";
import { networkConfig } from "../../helper-hardhat-config";
import { LovePoemV2, LovePoemV2__factory } from "../../typechain-types";
import { LovePoemV2Database } from "../../models";
import {
  createTables,
  getJoinedTable,
  prepareSqlForTables,
} from "../../scripts/v2";
import { retrieveMetadata } from "../../utils/retrieve-abi";
import {
  insertAttributes,
  selectFromJoinedTable,
  updateAttributes,
} from "../../scripts/v2/prepareTables";
import { Wallet, Signer } from "@tableland/local/node_modules/ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("LovePoemV2 Unit Tests", async function () {
  // Set a timeout for spinning up the Local Tableland instance during setup
  this.timeout(20000);

  let LovePoemV2Factory: LovePoemV2__factory;
  let lovePoemV2: LovePoemV2;

  let signer: Wallet;
  let originalHolder: SignerWithAddress;
  let newHolder: SignerWithAddress;
  let donor: SignerWithAddress;

  let db: LovePoemV2Database;
  let mainLovePoemTableName: string;
  let attributesLovePoemTableName: string;
  let attributesLovePoemTableId: string;
  let tokenId: number;

  const chainId = network.config.chainId!!;
  const tablelandBaseURI = `${networkConfig?.[chainId]?.tablelandBaseURI}query?unwrap=true&extract=true&statement=`;
  const mainTablePrefix: string = networkConfig?.[chainId]?.mainTablePrefix!!;
  const attributesTablePrefix: string =
    networkConfig?.[chainId]?.attributesTablePrefix!!;
  const mainTableSchema = `id int primary key, name text, description text, image text`;
  const attributesTableSchema = `main_id int not null, trait_type text not null, value text`;

  before(async () => {
    // first acc used to deploy tables
    signer = getAccounts()?.[1];
    db = getDatabase(signer);
    [, , originalHolder, newHolder, donor] = await ethers.getSigners();

    LovePoemV2Factory = (await hre.ethers.getContractFactory(
      "LovePoemV2",
    )) as LovePoemV2__factory;
    console.log("Deploying LovePoemV2...");
    lovePoemV2 = await LovePoemV2Factory.deploy(
      tablelandBaseURI,
      mainTablePrefix,
      attributesTablePrefix,
    );
    await lovePoemV2.deployed();
    console.log(
      "LovePoemV2 deployed to: ",
      lovePoemV2.address,
      "by ",
      await lovePoemV2.signer.getAddress(),
    );
  });

  it("Should create LovePoemV2 main table", async function () {
    const { tableName } = await createTables(
      mainTablePrefix,
      mainTableSchema,
      db,
    );
    mainLovePoemTableName = tableName;

    expect(mainLovePoemTableName).to.equal(`${mainTablePrefix}_${chainId}_2`);
  });
  it("Should create LovePoemV2 attributes table", async function () {
    const { tableName, tableId } = await createTables(
      attributesTablePrefix,
      attributesTableSchema,
      db,
    );
    attributesLovePoemTableName = tableName;
    attributesLovePoemTableId = tableId;
    expect(attributesLovePoemTableName).to.equal(
      `${attributesTablePrefix}_${chainId}_3`,
    );
  });
  it("Should join LovePoemV2 tables and insert original metadata", async function () {
    // Prep sql statements to join two tables & insert metadata
    const sqlInsertStatements = await prepareSqlForTables(
      mainLovePoemTableName,
      attributesLovePoemTableName,
    );

    for await (let statement of sqlInsertStatements) {
      const { main, attributes } = statement || {};
      const { meta: insertIntoMain } = await db.prepare(main).all();
      const insertIntoMainResult = await insertIntoMain.txn?.wait();
      if (insertIntoMain) {
        console.log("Inserted into main table: ", insertIntoMainResult);
      } else {
        console.log(
          "Failed to insert into main table: ",
          insertIntoMainResult?.error,
        );
      }
      // Insert attributes to attributes table corresponding to each main table row (id = main.id)
      for await (let attribute of attributes) {
        const { meta: insertIntoAttributes } = await db
          .prepare(attribute)
          .all();
        const insertIntoAttributesResult =
          await insertIntoAttributes.txn?.wait();
        if (insertIntoAttributes) {
          console.log(
            "Inserted into attributes table: ",
            insertIntoAttributesResult,
          );
        } else {
          console.log(
            "Failed to insert into attributes table: ",
            insertIntoAttributesResult,
          );
        }
        expect(insertIntoAttributesResult?.tableId).to.equal("3");
      }
      expect(insertIntoMainResult?.tableId).to.equal("2");
    }
  });

  it("Should get initial baseURI of LovePoemV2 same as tableland baseURI of given network", async function () {
    const lovePoemV2BaseURI = await lovePoemV2.getBaseURIString();
    console.log("LovePoemV2 baseURI: ", lovePoemV2BaseURI);
    expect(lovePoemV2BaseURI).to.equal(tablelandBaseURI);
  });
  it("Should mint a LovePoemV2", async function () {
    console.log(
      "Connect LovePoemV2 & Mint to Original Holder with address: ",
      originalHolder.address,
    );
    const mintLovePoemV2Token = await lovePoemV2.connect(originalHolder).mint();
    const mintTxn = await mintLovePoemV2Token.wait();
    console.log("LovePoemV2 mint txn event logs: ", mintTxn?.events);
    const mintReceipient = mintTxn?.events?.[0]?.args?.to;
    tokenId = mintTxn?.events?.[0]?.args?.tokenId;
    console.log(
      `\nLovePoemV2Token minted: tokenId '${tokenId}' to '${mintReceipient}'`,
    );
    const tokenURI = await lovePoemV2.tokenURI(tokenId);
    console.log(`'tokenURI' using token '${tokenId}' here:\n${tokenURI}`);
    expect(tokenId).to.equal("0");
  });

  it("Should return the joined LovePoemV2 table in JSON format equal to the original metaddata", async function () {
    const [joinedTable] = await getJoinedTable(
      db,
      mainLovePoemTableName,
      attributesLovePoemTableName,
    );
    const metadata = JSON.parse(JSON.stringify(joinedTable?.metadata));
    const retrievedOriginalMetadata = JSON.parse(retrieveMetadata("0")!!);

    expect(metadata).to.deep.equal(retrievedOriginalMetadata);
  });
  it("Should update the status attribute of LovePoemV2 to GATE_OPEN", async function () {
    await updateAttributes(
      db,
      attributesLovePoemTableName,
      "Status",
      "GATE_OPEN",
    );

    const selectAttributeStmt = `json_group_array(json_object('trait_type',trait_type,'value', value)) as attributes `;
    const [updatedAttributesObj] = await selectFromJoinedTable(
      db,
      mainLovePoemTableName,
      attributesLovePoemTableName,
      selectAttributeStmt,
    );
    const updatedAttribute = (
      updatedAttributesObj?.attributes as unknown as {
        trait_type: string;
        value: string;
      }[]
    )?.find(({ trait_type }) => trait_type === "Status");
    expect(updatedAttribute?.value).to.equal("GATE_OPEN");
  });

  it("Should insert new attribute of LovePoemV2 with existing tokenId", async function () {
    await insertAttributes(
      db,
      tokenId.toString(),
      attributesLovePoemTableName,
      "ExclusiveAccess",
      "UNRELEASED_TRACKS",
    );
    const selectAttributeStmt = `json_group_array(json_object('trait_type',trait_type,'value', value)) as attributes `;
    const [updatedAttributesObj] = await selectFromJoinedTable(
      db,
      mainLovePoemTableName,
      attributesLovePoemTableName,
      selectAttributeStmt,
    );
    console.log("Updated Attributes: ", updatedAttributesObj);
    const updatedAttribute = (
      updatedAttributesObj?.attributes as unknown as {
        trait_type: string;
        value: string;
      }[]
    )?.find(({ trait_type }) => trait_type === "ExclusiveAccess");
    expect(updatedAttribute?.value).to.equal("UNRELEASED_TRACKS");
  });

  it("Should transfer holdership to new address", async function () {
    console.log(
      "Balance of Original Holder before transfer: ",
      originalHolder.address,
      (await lovePoemV2.balanceOf(originalHolder.address)).toString(),
    );

    console.log(
      "Balance of New Holder before transfer: ",
      newHolder.address,
      (
        await lovePoemV2.connect(newHolder).balanceOf(newHolder.address)
      ).toString(),
    );

    const transferHoldershipTxn = await lovePoemV2
      .connect(originalHolder)
      .transferHoldership(
        newHolder.address,
        donor.address,
        tokenId,
        1000000,
        false,
      );
    const transferHoldershipTxnReceipt = await transferHoldershipTxn.wait();
    const currentHolder = transferHoldershipTxnReceipt?.events?.find(
      (e) => e?.event === "HoldershipTransferred",
    )?.args?.newHolder;
    const currentHolderBalance = await lovePoemV2.balanceOf(currentHolder);
    console.log(
      "Current holder: ",
      currentHolder,
      currentHolderBalance.toString(),
    );
    expect(currentHolder).to.equal(newHolder.address);
  });
});
