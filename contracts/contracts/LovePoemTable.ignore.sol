//  SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@tableland/evm/contracts/utils/TablelandDeployments.sol";
import "@tableland/evm/contracts/utils/SQLHelpers.sol";

contract LovePoemTable is ERC721Holder {
	// unique table id and custom table prefix
	uint256 public tableId;
	string private constant _TABLE_PREFIX = "love_poem";

	// Creates a table with an `id` and `val` column
	constructor() {
		tableId = TablelandDeployments.get().create(
			address(this),
			SQLHelpers.toCreateFromSchema(
				"id integer primary key,"
				"val text",
				_TABLE_PREFIX
			)
		);

		TablelandDeployments.get().mutate(
			address(this),
			tableId,
			SQLHelpers.toInsert(
				_TABLE_PREFIX,
				tableId,
				"id,val",
				string.concat(
					"1,", // Convert to a string
					",",
					SQLHelpers.quote("Bobby Tables") // Wrap strings in single quotes with the `quote` method
				)
			)
		);
	}

	function updateTable(uint256 id, string memory val) external {
		// Set the values to update
		string memory setters = string.concat("val=", SQLHelpers.quote(val));
		// Specify filters for which row to update
		string memory filters = string.concat("id=", Strings.toString(id));
		// Mutate a row at `id` with a new `val`
		TablelandDeployments.get().mutate(
			address(this),
			tableId,
			SQLHelpers.toUpdate(_TABLE_PREFIX, tableId, setters, filters)
		);
	}
}
