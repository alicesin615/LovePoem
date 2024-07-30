//  SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../VRFv2Consumer.ignore.sol";

interface IVRFv2Consumer {
	function mintNewPoem(
		uint256 currPoemPrice,
		VRFv2Consumer.RequestPurpose _requestPurpose
	) external payable returns (uint256 requestId);

	function requestRandomWordsFor(
		VRFv2Consumer.RequestPurpose _requestPurpose
	) external returns (uint256 requestId);

	function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) external;

	function getRequestStatus(
		uint256 _requestId
	) external view returns (bool fulfilled, uint256[] memory randomWords);

	function _createNewSubscription() external;

	function topUpSubscription(uint256 amount) external;

	function addConsumer(address consumerAddress) external;

	function removeConsumer(address consumerAddress) external;

	function cancelSubscription(address receivingWallet) external;

	function withdraw(uint256 amount, address to) external;
}
