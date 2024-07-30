//  SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

enum RequestPurpose {
	Mint,
	UnlockSurprise
}

interface IVRFv2Consumer {
	function prepRequest(RequestPurpose requestPurpose) external payable returns (uint256 requestId);

	function getRequestStatus(
		uint256 requestId
	) external view returns (bool fulfilled, uint256[] memory randomWords, RequestPurpose requestPurpose);

	function createNewSubscription() external returns (uint256 subscriptionId);

	function topUpSubscription(uint256 amount) external;

	function addConsumer(address consumerAddress) external;

	function removeConsumer(address consumerAddress) external;

	function cancelSubscription(address receivingWallet) external;

	function withdraw(uint256 amount, address to) external;
}

contract LovePoem is ERC721URIStorage, Ownable {
	IVRFv2Consumer private vrfConsumer;

	uint256 public s_requestId;
	bool public s_fulfilled;
	uint256[] public s_randomWords;
	RequestPurpose public s_requestPurpose;

	string private baseURI;
	uint256 public s_poemPrice;
	uint256 public immutable maxSupply = 300;
	uint256 private currentPoemId;

	enum PhotoCard {
		LILAC,
		PALETTE,
		BOOKMARK
	}
	enum ExclusiveAccess {
		BEHIND_THE_SCENES,
		UNRELEASED_TRACKS
	}

	struct LovePoemPlus {
		PhotoCard photoCard;
		ExclusiveAccess exclusiveAccess;
		bool letterToIU;
	}

	mapping(uint256 => LovePoemPlus) public poems;
	mapping(uint256 => string) private _tokenURIs;

	event VRFConsumerRegistered();
	event ReturnedRandomness(uint256 indexed requestId, uint256[] randomWords);
	event PoemMinted(uint256 indexed poemId, address requester);
	error FullyMinted();

	constructor(string memory initialBaseURI) ERC721("LovePoem", "POEM") Ownable() {
		baseURI = initialBaseURI;
		currentPoemId = 1;
	}

	function registerVRFConsumer(address vrfConsumerAddress) external onlyOwner {
		vrfConsumer = IVRFv2Consumer(vrfConsumerAddress);
		emit VRFConsumerRegistered();
	}

	function requestRandomness(RequestPurpose _requestPurpose) external onlyOwner returns (uint256 requestId) {
		s_requestPurpose = _requestPurpose;
		s_requestId = vrfConsumer.prepRequest(_requestPurpose);
		return s_requestId;
	}

	function receiveRandomness(uint256 _requestId) external onlyOwner returns (uint256[] memory) {
		s_requestId = _requestId;
		(bool fulfilled, uint256[] memory randomWords, RequestPurpose requestPurpose) = vrfConsumer
			.getRequestStatus(s_requestId);
		s_fulfilled = fulfilled;
		s_randomWords = randomWords;
		s_requestPurpose = requestPurpose;
		emit ReturnedRandomness(s_requestId, s_randomWords);
		return s_randomWords;
	}

	function preparePoemToMint(address requester, uint256[] memory randomWords) external onlyOwner {
		if (currentPoemId == maxSupply) {
			revert FullyMinted();
		}

		PhotoCard photoCard = PhotoCard(randomWords[0] % 3);
		ExclusiveAccess exclusiveAccess = ExclusiveAccess(randomWords[1] % 2);
		bool letterToIU = (randomWords[2] % 2) == 0;

		mintPoem(requester, photoCard, exclusiveAccess, letterToIU);
	}

	function mintPoem(
		address to,
		PhotoCard _photoCard,
		ExclusiveAccess _exclusiveAccess,
		bool _letterToIU
	) internal onlyOwner {
		LovePoemPlus memory lovePoemPlus = LovePoemPlus(_photoCard, _exclusiveAccess, _letterToIU);
		poems[currentPoemId] = lovePoemPlus;
		string memory assignedPhotoCard = _photoCard == PhotoCard.LILAC ? "1" : _photoCard == PhotoCard.PALETTE
			? "2"
			: "3";

		_safeMint(to, currentPoemId);
		_setTokenURI(currentPoemId, string(abi.encodePacked(baseURI, assignedPhotoCard, ".jpeg")));
		emit PoemMinted(currentPoemId, to);
		currentPoemId++;
	}

	/**
	 * @notice Public poem info for verification
	 */
	function getPoemInfo(uint256 poemId) public view returns (LovePoemPlus memory poemInfo) {
		return poems[poemId];
	}

	function getPhotoCard(uint256 poemId) private view onlyOwner returns (PhotoCard) {
		return getPoemInfo(poemId).photoCard;
	}

	function getExclusiveAccess(uint256 poemId) private view onlyOwner returns (ExclusiveAccess) {
		return getPoemInfo(poemId).exclusiveAccess;
	}

	function getLetterToIU(uint256 poemId) private view onlyOwner returns (bool) {
		return getPoemInfo(poemId).letterToIU;
	}

	function currentCirculatingSupply() public view returns (uint256) {
		return currentPoemId;
	}

	function getBaseURI() external view onlyOwner returns (string memory) {
		return _baseURI();
	}

	function _baseURI() internal view virtual override onlyOwner returns (string memory) {
		return baseURI;
	}

	function burnPoem(uint256 poemId) external onlyOwner {
		_burn(poemId);
	}

	function _burn(uint256 poemId) internal virtual override {
		super._burn(poemId);

		if (bytes(_tokenURIs[poemId]).length != 0) {
			delete _tokenURIs[poemId];
		}
	}
}
