//  SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import "./LovePoem.sol";
import "./interfaces/ILovePoem.sol";
import "hardhat/console.sol";

contract VRFv2Consumer is ConfirmedOwner, VRFConsumerBaseV2 {
	VRFCoordinatorV2Interface immutable COORDINATOR;
	LinkTokenInterface immutable LINKTOKEN;

	address vrfCoordinator = 0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625;
	address linkTokenContract = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
	bytes32 keyHash = 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c;
	uint32 callbackGasLimit = 100000;
	uint16 requestConfirmations = 3;
	uint32 numWords = 3;

	uint256[] public s_randomWords;
	uint256 public s_requestId;
	uint64 private s_subscriptionId;
	address public s_owner;

	// past requests Id.
	uint256[] public requestIds;
	uint256 public lastRequestId;

	ILovePoem internal s_lovePoem;
	uint256 public s_poemPrice;

	enum RequestPurpose {
		Mint,
		UnlockSurprise
	}

	struct RequestStatus {
		bool fulfilled;
		bool exists;
		RequestPurpose requestPurpose;
		address requester;
		uint256[] randomWords;
	}

	mapping(uint256 => RequestStatus) public s_requests;

	error InsufficientFunds(uint256 amount);
	event RequestSent(uint256 requestId, uint32 numWords, RequestPurpose requestPurpose);
	event RequestFulfilled(uint256 requestId, uint256[] randomWords, RequestPurpose requestPurpose);

	constructor() VRFConsumerBaseV2(vrfCoordinator) ConfirmedOwner(msg.sender) {
		COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
		LINKTOKEN = LinkTokenInterface(linkTokenContract);
		s_owner = msg.sender;
		//Create a new subscription when you deploy the contract.
		_createNewSubscription();
	}

	function mintNewPoem(uint256 currPoemPrice, RequestPurpose _requestPurpose) external payable returns (uint256 requestId) {
		s_poemPrice = currPoemPrice;
		if (msg.value < s_poemPrice) {
			revert InsufficientFunds(msg.value);
		}

		return requestRandomWordsFor(_requestPurpose);
	}

	function requestRandomWordsFor(RequestPurpose _requestPurpose) internal returns (uint256 requestId) {
		requestId = COORDINATOR.requestRandomWords(keyHash, s_subscriptionId, requestConfirmations, callbackGasLimit, numWords);
		s_requests[requestId] = RequestStatus({fulfilled: false, exists: true, requestPurpose: _requestPurpose, requester: msg.sender, randomWords: new uint256[](0)});
		requestIds.push(requestId);
		lastRequestId = requestId;
		emit RequestSent(requestId, numWords, _requestPurpose);
		return requestId;
	}

	function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
		require(s_requests[_requestId].exists, "request not found");
		s_requests[_requestId].fulfilled = true;
		s_requests[_requestId].randomWords = _randomWords;
		s_randomWords = _randomWords;
		emit RequestFulfilled(_requestId, _randomWords, s_requests[_requestId].requestPurpose);
	}

	function getRequestStatus(uint256 _requestId) external view returns (bool fulfilled, uint256[] memory randomWords) {
		require(s_requests[_requestId].exists, "request not found");
		RequestStatus memory request = s_requests[_requestId];
		return (request.fulfilled, request.randomWords);
	}

	// Create a new subscription when the contract is initially deployed.
	function _createNewSubscription() internal onlyOwner {
		s_subscriptionId = COORDINATOR.createSubscription();
		// Add this contract as a consumer of its own subscription.
		COORDINATOR.addConsumer(s_subscriptionId, address(this));
	}

	// Assumes this contract owns link.
	// 1000000000000000000 = 1 LINK
	function topUpSubscription(uint256 amount) external onlyOwner {
		LINKTOKEN.transferAndCall(address(COORDINATOR), amount, abi.encode(s_subscriptionId));
	}

	function addConsumer(address consumerAddress) external onlyOwner {
		// Add a consumer contract to the subscription.
		COORDINATOR.addConsumer(s_subscriptionId, consumerAddress);
	}

	function removeConsumer(address consumerAddress) external onlyOwner {
		// Remove a consumer contract from the subscription.
		COORDINATOR.removeConsumer(s_subscriptionId, consumerAddress);
	}

	function cancelSubscription(address receivingWallet) external onlyOwner {
		// Cancel the subscription and send the remaining LINK to a wallet address.
		COORDINATOR.cancelSubscription(s_subscriptionId, receivingWallet);
		s_subscriptionId = 0;
	}

	// 1000000000000000000 = 1 LINK
	function withdraw(uint256 amount, address to) external onlyOwner {
		LINKTOKEN.transfer(to, amount);
	}
}
