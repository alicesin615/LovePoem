const { ethers, BytesLike } = require('ethers');

function bytesToUTF8String(bytes: typeof BytesLike) {
    return ethers.utils.toUtf8String(bytes);
}
module.exports = { bytesToUTF8String };
