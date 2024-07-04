import fs from "fs";
import dotenv from "dotenv";
import pinataSDK, {
  PinataMetadata,
  PinataOptions,
  PinataPinListFilterOptions,
  PinataPinResponse,
} from "@pinata/sdk";
dotenv.config();

const PINATA_JWT = process.env.PINATA_JWT;
const pinata = new pinataSDK({ pinataJWTKey: PINATA_JWT });

export async function uploadImageToPinata(
  filePath: string,
  fileName: string,
): Promise<string | undefined> {
  const readableStreamForFile = fs.createReadStream(filePath);
  const options = {
    pinataMetadata: {
      name: fileName,
    } as PinataMetadata,
    pinataOptions: {
      cidVersion: 0,
      wrapWithDirectory: true,
    } as PinataOptions,
  };

  let uploadResult: PinataPinResponse | undefined = undefined;
  try {
    uploadResult = await pinata.pinFileToIPFS(readableStreamForFile, options);
  } catch (error) {
    console.error(error);
  }

  const { IpfsHash } = uploadResult || {};
  return IpfsHash;
}

/**
 * Verifies the upload status of a file by checking if it has been pinned on Pinata via its hash.
 *
 * @param {string} hash - The hash of the file to verify.
 * @return {Promise<boolean | undefined>} A Promise that resolves to a boolean indicating if the file has been uploaded, or undefined if there was an error.
 */
export async function verifyUploadStatus(
  hash: string,
): Promise<boolean | undefined> {
  let uploaded: boolean | undefined = undefined;

  const filters: PinataPinListFilterOptions = {
    status: "pinned",
    hashContains: hash,
  };

  try {
    const { rows } = (await pinata.pinList(filters)) || {};
    uploaded = rows?.length > 0;
  } catch (error) {
    console.error(error);
  }

  return uploaded;
}
