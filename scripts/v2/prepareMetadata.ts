import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { filesFromPaths } from "files-from-path";
import { uploadImageToPinata, verifyUploadStatus } from "./setupPinata.ts";
import {
  AnyLink,
  Client,
  FileLike,
  UnknownLink,
  UploadListSuccess,
} from "@web3-storage/w3up-client/types";
import type { Metadata } from "../../models/common.model.ts";
dotenv.config();

const dir = path.resolve(__dirname);
const PINATA_GATEWAY = process.env.PINATA_GATEWAY;

const WEB3_SPACE_KEY = process.env.WEB3_SPACE_KEY || "";
const WEB3_ACCOUNT = process.env.WEB3_ACCOUNT as `${string}@${string}`;

async function getFilesFromPath(path: string) {
  const files = await filesFromPaths([path]);
  console.log(`read ${files.length} file(s) from ${path}`);
  return files;
}

/**
 * @deprecated
 * Uploads images to IPFS using the provided client.
 *
 * @param {FileLike[]} images - Array of images to upload
 * @return {AnyLink} The CID of the uploaded directory
 */
async function uploadToIpfs(
  client: Client,
  images: FileLike[],
): Promise<AnyLink> {
  let directoryCid: UnknownLink | undefined = undefined;
  try {
    directoryCid = await client.uploadDirectory(images);
  } catch (error) {
    console.error("Error uploading images: ", error);
  }

  return directoryCid as AnyLink;
}

/**
 * @deprecated web3-storage/w3up-client is esm-only module, which has compatibility issues with running
 * hardhat(only commonjs supported) & typescript combined
 *
 * Verifies if an image with the given CID has been successfully uploaded to IPFS using the provided js client.
 *
 * @param {Client} client - The js client instance to interact with the w3up platform
 * @param {string} cid - The CID (Content Identifier) of the image to verify against {UploadListSuccess}.
 * @return {Promise<boolean>} A boolean indicating whether the image has been successfully uploaded or not.
 */
async function verifyImageOnIpfs(
  client: Client,
  cid: string,
): Promise<boolean> {
  let verified = false;
  let uploadedList: UploadListSuccess | undefined = undefined;

  try {
    uploadedList = await client.capability.upload.list();
  } catch (error) {
    console.error("Error verifying image on IPFS: ", error);
  }

  if (uploadedList?.size) {
    verified = uploadedList?.before === cid;
  }

  return verified;
}

/**
 * @deprecated web3-storage/w3up-client is esm-only module, which has compatibility issues with running
 * hardhat(only commonjs supported) & typescript combined
 *
 * Sets up the client by creating a new client, logging in with the web3 account,
 * and setting the current space to the specified Space DID {WEB3_SPACE_KEY}.
 *
 * @return {Promise<Client>} The client that has been set up locally with the web3 storage account.
 */
async function setUpClient(): Promise<Client> {
  const w3upClient = await import("@web3-storage/w3up-client");

  const client = await w3upClient.create();
  try {
    await client.login(WEB3_ACCOUNT);
  } catch (error) {
    console.error("Error loging in: ", error);
  }

  try {
    await client.setCurrentSpace(`did:key:${WEB3_SPACE_KEY}`);
  } catch (error) {
    console.error(
      "Error setting up web3 storage client in local space: ",
      error,
    );
  }

  return client;
}

/**
 * Parses a metadata file for a given ID, updates the image field with the IPFS CID, and writes the updated metadata file.
 *
 * @param {number} id - The ID of the metadata file to parse.
 * @param {string} metadataDirPath - The path to the directory containing metadata files.
 * @param {string} imagesDirPath - The path to the directory containing images.
 * @return {Object} The parsed metadata object with the image field updated to include the IPFS CID.
 */
async function parseMetadataFile(
  id: number,
  metadataDirPath: string,
  imagesDirPath: string,
): Promise<Metadata> {
  const imagesPath = path.join(imagesDirPath, `${id}.jpeg`);

  let metadataFile: Buffer = Buffer.from("");
  const metadataFilePath = path.join(metadataDirPath, `${id}`);
  try {
    metadataFile = await fs.promises.readFile(metadataFilePath);
  } catch (error) {
    console.error(`Error reading file in metadata directory: ${error}`);
  }

  const metadataJson: Metadata = JSON.parse(metadataFile.toString());

  let isVerified: boolean | undefined;
  let ipfsHash: string | undefined;
  let prevSavedHash: string | undefined;
  if (metadataJson.image) {
    prevSavedHash = String(
      metadataJson.image.match(/\/ipfs\/([a-zA-Z0-9]+)\//)?.[1],
    );
    try {
      isVerified = await verifyUploadStatus(prevSavedHash);
      console.log(
        `Verified image ${id} already uploaded on IPFS: ${isVerified}`,
      );
    } catch (error) {
      console.error(`Error verifying image ${id} on IPFS:`, error);
    }
  } else {
    ipfsHash = await uploadImageToPinata(imagesPath, `${id}.jpeg`);
    metadataJson.image = `${PINATA_GATEWAY}/ipfs/${ipfsHash}/${id}.jpeg`;
    const metadataFileBuffer = Buffer.from(JSON.stringify(metadataJson));
    try {
      await fs.promises.writeFile(metadataFilePath, metadataFileBuffer);
    } catch (error) {
      console.error(`Error writing file in metadata directory: ${error}`);
    }
  }

  return metadataJson;
}

/**
 * Prepares the metadata by parsing each metadata file in the specified directory,
 * updating the image field with the IPFS CID, and adding a new field called `id` to each metadata object.
 * @example metadata/0 (omit the extension) | images/0.jpeg
 * @return {Promise<Metadata[]>} An array of parsed metadata objects with the `id` field added.
 */
export async function prepareMetadata(): Promise<Metadata[]> {
  const finalMetadata: Metadata[] = [];
  const metadataDirPath = path.join(dir, "../../", "metadata");
  const imagesDirPath = path.join(dir, "../../", "images");

  const metadataFiles = await getFilesFromPath(metadataDirPath);
  for await (const file of metadataFiles) {
    let id = Number(file.name.replace(/^\//, ""));
    try {
      let metadataObj: Metadata | undefined = await parseMetadataFile(
        id,
        metadataDirPath,
        imagesDirPath,
      );
      // Add a new field called `id`, which will be used during INSERTs as a unique row `id`
      metadataObj["id"] = Number(id);
      finalMetadata.push(metadataObj);
    } catch (error) {
      console.error(`Error parsing metadata file: ${error}`);
    }
  }
  console.log("finalMetadata: ", finalMetadata);
  return finalMetadata;
}
