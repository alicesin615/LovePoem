// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @dev Implementation of a simple NFT, using Tableland to host metadata in a two table setup.
 */
contract LovePoemV2 is ERC721URIStorage, Ownable {
	string private baseURI;
	// Schema: id int primary key, name text, description text, image text
	string private mainTable;
	// Schema: main_id int not null, trait_type text not null, value text
	string private attributesTable;

	uint256 public immutable maxSupply = 5;
	uint256 private tokenIdCounter;

	constructor(
		string memory _initialBaseURI,
		string memory _mainTable,
		string memory _attributesTable
	) ERC721("LovePoem", "POEM") onlyOwner() {
		tokenIdCounter = 0;
		maxSupply = 5;
		baseURI = _initialBaseURI;
		mainTable = _mainTable;
		attributesTable = _attributesTable;
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
	function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
		require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
		string memory baseURIString = _baseURI();

		if (bytes(baseURIString).length == 0) {
			return "";
		}

		/**
		 *   An SQL query to JOIN two tables to compose the metadata accross a 'main' and 'attributes' table
		 *
		 *   SELECT json_object(
		 *       'id', id,
		 *       'name', name,
		 *       'description', description,
		 *       'image', image,
		 *       'attributes', json_group_array(
		 *           json_object(
		 *               'trait_type',trait_type,
		 *               'value', value
		 *           )
		 *       )
		 *   )
		 *   FROM {mainTable} JOIN {attributesTable}
		 *       ON {mainTable}.id = {attributesTable}.main_id
		 *   WHERE id = <main_id>
		 *   GROUP BY id
		 */
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
		return
			string(
				abi.encodePacked(
					baseURIString,
					"unwrap=true&extract=true",
					query,
					Strings.toString(tokenId),
					"%20group%20by%20id"
				)
			);
	}

	/**
	 * @dev Mint an NFT, incrementing the `_tokenIdCounter` upon each call.
	 */
	function mint() public {
		require(tokenIdCounter < maxSupply, "Maximum number of tokens have been minted");
		_safeMint(msg.sender, tokenIdCounter);
		tokenIdCounter++;
	}

	function totalSupply() public pure returns (uint256) {
		return maxSupply;
	}
}
