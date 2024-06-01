//  SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./LovePoemLib.sol";

contract LovePoem is ERC721URIStorage, Ownable {
	using LovePoemLib for uint256;

	string private baseURI;

	uint256 public immutable maxSupply = 30;

	mapping(uint256 => LovePoemLib.LovePoem) public poems;
	mapping(LovePoemLib.PhotoCard => uint256) public ipfsHash;

	uint256 private _currentPoemId;

	event PoemMinted(uint256 indexed poemId, address requester);
	error FullyMinted();

	constructor(string memory _initialBaseURI) ERC721("LovePoem", "POEM") Ownable() {
		baseURI = _initialBaseURI;
	}

	function preparePoemToMint(address requester, uint256[] memory randomWords) external onlyOwner {
		if (_currentPoemId >= maxSupply) {
			revert FullyMinted();
		}
		LovePoemLib.PhotoCard photoCard = getPhotoCard(randomWords[0]);
		LovePoemLib.ExclusiveAccess exclusiveAccess = getExclusiveAccess(randomWords[1]);
		LovePoemLib.LetterToIU letterToIU = getLetterToIU(randomWords[2]);
		mintPoem(requester, photoCard, exclusiveAccess, letterToIU);
	}

	function mintPoem(address to, LovePoemLib.PhotoCard _photoCard, LovePoemLib.ExclusiveAccess _exclusiveAccess, LovePoemLib.LetterToIU _letterToIU) internal onlyOwner {
		_currentPoemId++;
		poems[_currentPoemId] = LovePoemLib.LovePoem({photoCard: _photoCard, exclusiveAccess: _exclusiveAccess, letterToIU: _letterToIU});

		_safeMint(to, _currentPoemId);
		_setTokenURI(_currentPoemId, string(abi.encodePacked(baseURI, _currentPoemId)));
		emit PoemMinted(_currentPoemId, to);
	}

	function _baseURI() internal view virtual override onlyOwner returns (string memory) {
		return baseURI;
	}

	function getPoemInfo(uint256 poemId) public view returns (LovePoemLib.LovePoem memory poemInfo) {
		return poems[poemId];
	}

	function getPhotoCard(uint256 poemId) private view onlyOwner returns (LovePoemLib.PhotoCard) {
		return getPoemInfo(poemId).photoCard;
	}

	function getExclusiveAccess(uint256 poemId) private view onlyOwner returns (LovePoemLib.ExclusiveAccess) {
		return getPoemInfo(poemId).exclusiveAccess;
	}

	function getLetterToIU(uint256 poemId) private view onlyOwner returns (LovePoemLib.LetterToIU) {
		return getPoemInfo(poemId).letterToIU;
	}

	function currentCirculatingSupply() public view returns (uint256) {
		return _currentPoemId;
	}
}
