//  SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "../LovePoem.ignore.sol";
import "../LovePoemLib.sol";

interface ILovePoem {
	function _baseURI() external view returns (string memory);

	function preparePoemToMint(address requester, uint256[] memory randomWords) external;

	function mintPoem(
		address to,
		LovePoemLib.PhotoCard _photoCard,
		LovePoemLib.ExclusiveAccess _exclusiveAccess,
		LovePoemLib.LetterToIU _letterToIU
	) external;

	function getPoemInfo(uint256 poemId) external view returns (LovePoemLib.LovePoem memory);

	function getPhotoCard(uint256 poemId) external view returns (LovePoemLib.PhotoCard);

	function getExclusiveAccess(uint256 poemId) external view returns (LovePoemLib.ExclusiveAccess);

	function getLetterToIU(uint256 poemId) external view returns (LovePoemLib.LetterToIU);

	function currentCirculatingSupply() external view returns (uint256 currentCiruclatingSupply);
}
