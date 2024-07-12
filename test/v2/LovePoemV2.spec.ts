import hre, { network } from "hardhat";
import { expect } from "chai";
import { describe, it } from "mocha";
import { getAccounts, getDatabase } from "@tableland/local";
import type { Signer } from "@tableland/sdk/helpers";
import { getDefaultProvider } from "@tableland/sdk/helpers";
import { networkConfig } from "../../helper-hardhat-config";
import { LovePoemV2, LovePoemV2__factory } from "../../typechain-types";
import { LovePoemV2Database } from "../../models";
import { createLovePoemTables, prepareSqlForTables } from "../../scripts/v2";

describe("LovePoemV2 Unit Tests", async function () {
  // Set a timeout for spinning up the Local Tableland instance during setup
  this.timeout(20000);

  let LovePoemV2Factory: LovePoemV2__factory;
  let lovePoemV2: LovePoemV2;
  let owner: Signer;
  let wallet: Signer;
  let db: LovePoemV2Database;
  let mainLovePoemTableName: string;
  let attributesLovePoemTableName: string;

  const chainId = network.config.chainId!!;
  const accounts = getAccounts();
  const tablelandBaseURI = networkConfig?.[chainId]?.tablelandBaseURI!!;
  const mainTablePrefix: string = networkConfig?.[chainId]?.mainTablePrefix!!;
  const attributesTablePrefix: string =
    networkConfig?.[chainId]?.attributesTablePrefix!!;
  const mainTableSchema = `id int primary key, name text, description text, image text`;
  const attributesTableSchema = `main_id int not null, trait_type text not null, value text`;
  // const tablelandBaseURI = helpers.getBaseUrl(chainId);

  const provider = getDefaultProvider(tablelandBaseURI);
  db = getDatabase(accounts?.[1]);

  before(async () => {
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
      await lovePoemV2.owner(),
    );
  });

  it("Should create LovePoemV2 main table", async function () {
    mainLovePoemTableName = await createLovePoemTables(
      mainTablePrefix,
      mainTableSchema,
      db,
    );

    expect(mainLovePoemTableName).to.equal(`${mainTablePrefix}_${chainId}_2`);
  });
  it("Should create LovePoemV2 attributes table", async function () {
    attributesLovePoemTableName = await createLovePoemTables(
      attributesTablePrefix,
      attributesTableSchema,
      db,
    );
    expect(attributesLovePoemTableName).to.equal(
      `${attributesTablePrefix}_${chainId}_3`,
    );
  });
  it("Should join LovePoemV2 tables and insert metadata", async function () {
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
      // Insert attributes
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
  it("Should get the initial baseURI of LovePoemV2", async function () {
    const lovePoemV2BaseURI = await lovePoemV2.getBaseURIString();
    expect(lovePoemV2BaseURI).to.equal(tablelandBaseURI);
  });
  it("Should mint a LovePoemV2 with tokenId", async function () {
    const mintLovePoemV2Token = await lovePoemV2.mint();
    const mintTxn = await mintLovePoemV2Token.wait();
    console.log("LovePoemV2 mint txn event args: ", mintTxn?.events?.[0]?.args);
    const mintReceipient = mintTxn?.events?.[0]?.args?.[1];
    const tokenId = mintTxn?.events?.[0]?.args?.[2];
    console.log(
      `\nLovePoemV2Token minted: tokenId '${tokenId.toNumber()}' to owner '${mintReceipient}'`,
    );
    const tokenURI = await lovePoemV2.tokenURI(tokenId);
    console.log(`'tokenURI' using token '${tokenId}' here:\n${tokenURI}`);
    expect(tokenId.toNumber()).to.equal(0);
  });
});
