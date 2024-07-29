// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

import "@openzeppelin/contracts/utils/Strings.sol";
import "./LovePoemLib.sol";

/**
 * @dev Implementation of an Event Ticketing NFT, using Tableland to host metadata in a two table setup.
 */
contract LovePoemV2 is ERC721URIStorage, Ownable {
	string private baseURI;
	string private mainTable;
	string private attributesTable;

	uint256 public immutable maxSupply = 300;
	uint256 private tokenIdCounter;

	mapping(uint256 => address) public tokenHolders; // mapping(tokenId => holderAddress)
	mapping(address => uint256) public balances; // mapping(holder => balance)

	event HoldershipTransferred(uint256 tokenId, address oldHolder, address newHolder);
	event PoemMinted(uint256 indexed tokenId, address owner);
	event SuccessfullyDonated(address donor, uint256 donationAmount);

	error InvalidHolder(uint256 tokenId, address requester);
	error InvalidTokenId(uint256 tokenId);
	error HolderAlreadyExists();
	error FailedToDonate(address donor, uint256 donationAmount);

	constructor(
		string memory _initialBaseURI,
		string memory _mainTable,
		string memory _attributesTable
	) ERC721("LovePoem", "POEM") onlyOwner() {
		tokenIdCounter = 0;
		baseURI = _initialBaseURI;
		mainTable = _mainTable;
		attributesTable = _attributesTable;
	}

	modifier onlyHolder(uint256 tokenId) {
		if (tokenHolders[tokenId] != msg.sender) {
			revert InvalidHolder(tokenId, msg.sender);
		}
		_;
	}

	modifier validToken(uint256 tokenId) {
		if (_exists(tokenId) == false) {
			revert InvalidTokenId(tokenId);
		}
		_;
	}

	function _baseURI() internal view virtual override returns (string memory) {
		return baseURI;
	}

	/**
	 *  @dev Must override the default implementation, which returns an empty string.
	 */
	function getBaseURIString() external view returns (string memory) {
		return _baseURI();
	}

	/**
	 *  @dev Must override the default implementation, which simply appends a `tokenId` to _baseURI.
	 *  @param tokenId - The id of the NFT token that is being requested
	 */
	function tokenURI(uint256 tokenId) public view virtual override validToken(tokenId) returns (string memory) {
		string memory baseURIString = _baseURI();

		if (bytes(baseURIString).length == 0) {
			return "";
		}

		// An SQL query to JOIN two tables to compose the metadata accross a 'main' and 'attributes' table
		string memory query = string(
			abi.encodePacked(
				"SELECT%20json_object%28%27id%27%2Cid%2C%27name%27%2Cname%2C%27description%27%2Cdescription%2C%27image%27%2Cimage%2C%27attributes%27%2Cjson_group_array%28json_object%28%27trait_type%27%2Ctrait_type%2C%27value%27%2Cvalue%29%29%29%20FROM%20",
				mainTable,
				"%20JOIN%20",
				attributesTable,
				"%20ON%20",
				mainTable,
				"%2Eid%20%3D%20",
				attributesTable,
				"%2Emain_id%20WHERE%20id%3D"
			)
		);

		// Return the baseURI with a query string, which looks up the token id in a row.
		return string(abi.encodePacked(baseURIString, query, Strings.toString(tokenId), "%20group%20by%20id"));
	}

	/**
	 * @dev Mint an NFT, incrementing the `tokenIdCounter` upon each call.
	 */
	function mint() public {
		require(tokenIdCounter < maxSupply, "Maximum number of tokens have been minted");
		isNotExistingHolder(msg.sender);

		_safeMint(msg.sender, tokenIdCounter);
		tokenHolders[tokenIdCounter] = msg.sender;
		balances[msg.sender] += 1;
		setTokenURI(tokenIdCounter);

		emit PoemMinted(tokenIdCounter, msg.sender);
		tokenIdCounter++;
	}

	function setTokenURI(uint256 tokenId) internal onlyHolder(tokenId) {
		_setTokenURI(tokenId, tokenURI(tokenId));
	}

	/**
	 * @notice Fn to be used to verify if caller is the token holder before
	 * allowing caller to make changes to the token holdership or its metadata
	 **/
	function isHolder(uint256 tokenId) public view returns (bool) {
		if (tokenHolders[tokenId] != msg.sender) {
			revert InvalidHolder(tokenId, msg.sender);
		}
		return _ownerOf(tokenId) == msg.sender;
	}

	function balanceOf(address holder) public view virtual override(IERC721, ERC721) returns (uint256) {
		require(holder != address(0), "Invalid receipient address");
		return balances[holder];
	}

	function isNotExistingHolder(address holder) internal view returns (bool) {
		if (balanceOf(holder) > 0) {
			revert HolderAlreadyExists();
		} else {
			return true;
		}
	}

	/**
	 * @notice Transfer nft to new address if the caller is the token holder.
	 * if isResale, % of the newly updated price of token will be donated
	 * Assumes that the newHolder has already made the payment to original holder
	 *
	 * @param currPrice required for validating the donation
	 **/
	function transferHoldership(
		address newHolder,
		address donationAddress,
		uint256 tokenId,
		uint256 currPrice,
		bool isResale
	) external payable onlyHolder(tokenId) {
		require(newHolder != address(0) && newHolder != msg.sender, "Invalid receipient address");
		balances[msg.sender] -= 1;
		balances[newHolder] += 1;
		tokenHolders[tokenId] = newHolder;
		safeTransferFrom(msg.sender, newHolder, tokenId);

		emit HoldershipTransferred(tokenId, msg.sender, newHolder);

		if (isResale) {
			require(msg.value >= ((currPrice * LovePoemLib.ResaleDonationRatio) / 100), "Insufficient donation amount");
			(bool success, ) = donationAddress.call{value: msg.value}("");
			if (!success) {
				revert FailedToDonate(msg.sender, msg.value);
			} else {
				emit SuccessfullyDonated(msg.sender, msg.value);
			}
		}
	}

	function totalSupply() public pure returns (uint256) {
		return maxSupply;
	}

	function _burn(uint256 tokenId) internal override(ERC721URIStorage) {
		super._burn(tokenId);
	}

	function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
		return super.supportsInterface(interfaceId);
	}
}
