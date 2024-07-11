import hre from "hardhat";
import { network } from "hardhat";
import { prepareSqlForTables } from "./prepareSqlForTables";
import { LocalTableland, getAccounts } from "@tableland/local";
import {
  TablelandNetworkConfig,
  baseURIs,
  proxies,
} from "@tableland/evm/network";
import { Database, helpers } from "@tableland/sdk";
import type { MainTableSchema, AttributesTableSchema } from "../../models";

async function main() {
  if (network?.name !== "localhost" && network?.name !== "local-tableland") {
    throw new Error("No localhost found.");
  }
  const registryAddress =
    network.name === "localhost" || network.name === "local-tableland"
      ? proxies["local-tableland" as keyof TablelandNetworkConfig]
      : proxies[network.name as keyof TablelandNetworkConfig];

  // Base URI for local tableland: http://localhost:8080/api/v1
  let tablelandBaseURI = (
    network.name === "localhost"
      ? baseURIs["local-tableland" as keyof TablelandNetworkConfig]
      : baseURIs[network.name as keyof TablelandNetworkConfig]
  ) as string;

  if (!registryAddress || !tablelandBaseURI) {
    throw new Error(
      "Failed to get registry or baseURI. Registry Address: " +
        "Registry Address: " +
        registryAddress +
        "Tableland Base URI: " +
        tablelandBaseURI,
    );
  }
  tablelandBaseURI = tablelandBaseURI?.match(
    /^https?:\/\/[^\/]+\/[^\/]+\/[^\/]+\/?/,
  )![0];
  console.log("Tableland Base URI: ", tablelandBaseURI);

  // Registry Table
  const mainTablePrefix = "lovePoem_main_table";
  const attributesTablePrefix = "lovePoem_attributes_table";
  // 1 `main` row to many `attributes`
  const mainTableSchema = `id int primary key, name text, description text, image text`;
  const attributesTableSchema = `main_id int not null, trait_type text not null, value text`;

  const chainId = network.config.chainId!;
  console.log("chainId of current network: ", chainId, network.name);

  // // Create local tableland instance
  const newLocalTableland = new LocalTableland();

  const [signer] = getAccounts(newLocalTableland);
  console.log("Signer: ", await signer.getAddress());

  const db = new Database<MainTableSchema | AttributesTableSchema>({
    signer,
    baseUrl: helpers.getBaseUrl(chainId),
  });

  // CREATE Main & Attributes tables
  const {
    meta: createMainTable,
    success: mainTableSuccess,
    error: mainTableError,
  } = await db
    .prepare(`CREATE TABLE ${mainTablePrefix} (${mainTableSchema});`)
    .all();
  const mainTableResult = await createMainTable.txn?.wait();
  if (mainTableSuccess) {
    console.log("Created main table: ", mainTableResult?.names?.[0]);
  } else {
    console.log("Failed to create main table: ", mainTableError);
  }
  const [lovePoemMainTableName] = createMainTable.txn?.names || [];

  const {
    meta: createAttributes,
    success: attributesTableSuccess,
    error: attributesTableError,
  } = await db
    .prepare(
      `CREATE TABLE ${attributesTablePrefix} (${attributesTableSchema});`,
    )
    .all();
  const attributesTableResult = await createAttributes.txn?.wait();
  if (attributesTableSuccess) {
    console.log(
      "Created attributes table: ",
      attributesTableResult?.names?.[0],
    );
  } else {
    console.log("Failed to create attributes table: ", attributesTableError);
  }
  const [lovePoemAttributesTableName] = createAttributes.txn?.names || [];

  // Prep sql statements to join two tables & insert metadata
  const sqlInsertStatements = await prepareSqlForTables(
    lovePoemMainTableName,
    lovePoemAttributesTableName,
  );

  // Insert metadata into the 'main' and 'attributes' tables, before smart contract deployment
  console.log(`\nWriting metadata to tables...`);
  for await (let statement of sqlInsertStatements) {
    const { main, attributes } = statement || {};
    const { meta: insertIntoMain } = await db.prepare(main).all();
    const insertIntoMainResult = await insertIntoMain.txn?.wait();
    if (insertIntoMain) {
      console.log("Inserted into main table: ", insertIntoMainResult);
    } else {
      console.log("Failed to insert into main table: ", insertIntoMainResult);
    }

    for await (let attribute of attributes) {
      const { meta: insertIntoAttributes } = await db.prepare(attribute).all();
      const insertIntoAttributesResult = await insertIntoAttributes.txn?.wait();
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
    }
  }
  // Deploy LovePoemV2 contract with the generated main & attributes table names
  const LovePoemV2Factory = await hre.ethers.getContractFactory("LovePoemV2");
  const lovePoemV2 = await LovePoemV2Factory.deploy(
    tablelandBaseURI,
    lovePoemMainTableName,
    lovePoemAttributesTableName,
  );
  console.log(`LovePoemV2 Contract deployed to ${lovePoemV2.address}`);
  await lovePoemV2.deployed();

  const baseURI = await lovePoemV2.getBaseURIString();
  console.log(`LovePoemV2 is using baseURI: ${baseURI}`);

  const mintLovePoemV2Token = await lovePoemV2.mint();
  const mintTxn = await mintLovePoemV2Token.wait();
  const mintReceipient = mintTxn?.events?.[0]?.args?.[1];
  const tokenId = mintTxn?.events?.[0]?.args?.[2];
  console.log(
    `\nLovePoemV2Token minted: tokenId '${tokenId.toNumber()}' to owner '${mintReceipient}'`,
  );
  const tokenURI = await lovePoemV2.tokenURI(tokenId);
  console.log(`'tokenURI' using token '${tokenId}' here:\n${tokenURI}`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
