//  SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";

contract VRFv2Consumer is ConfirmedOwner, VRFConsumerBaseV2 {
	VRFCoordinatorV2Interface immutable COORDINATOR;
	LinkTokenInterface immutable LINKTOKEN;

	address vrfCoordinator;
	address linkTokenContract;

	uint64 private s_subscriptionId;
	bytes32 s_keyHash;
	uint32 s_callbackGasLimit;
	uint16 s_requestConfirmations;
	uint32 s_numWords;
	address s_owner;

	uint256[] public s_randomWords;
	uint256 public s_requestId;
	RequestPurpose public s_requestPurpose;

	enum RequestPurpose {
		Mint,
		UnlockSurprise
	}

	struct RequestStatus {
		bool fulfilled;
		bool exists;
		RequestPurpose requestPurpose;
		uint256[] randomWords;
	}

	uint256[] public requestIds;
	uint256 public lastRequestId;
	mapping(uint256 => RequestStatus) public s_requests;

	error RequestNotFound(uint256 requestId);
	error InsufficientFunds(uint256 amount);
	event RequestSent(uint256 requestId, RequestPurpose requestPurpose);
	event RequestFulfilled(uint256 requestId, uint256[] randomWords, RequestPurpose requestPurpose);

	constructor(address _vrfCoordinator, address _linkTokenContract, bytes32 keyHash, uint16 requestConfirmations, uint32 callbackGasLimit, uint32 numWords) VRFConsumerBaseV2(_vrfCoordinator) ConfirmedOwner(msg.sender) {
		COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
		LINKTOKEN = LinkTokenInterface(_linkTokenContract);
		s_keyHash = keyHash;
		s_requestConfirmations = requestConfirmations;
		s_callbackGasLimit = callbackGasLimit;
		s_numWords = numWords;
		s_owner = msg.sender;
		createNewSubscription();
	}

	/**
	 * @notice Prepares a request to be fulfilled
	 * @param requestPurpose The purpose of the request to be defined by LovePoem : Enum RequestPurpose
	 */
	function prepRequest(RequestPurpose requestPurpose) external payable returns (uint256 requestId) {
		s_requestPurpose = requestPurpose;
		return requestRandomWordsFor(requestPurpose);
	}

	function requestRandomWordsFor(RequestPurpose requestPurpose) internal returns (uint256 requestId) {
		requestId = COORDINATOR.requestRandomWords(s_keyHash, s_subscriptionId, s_requestConfirmations, s_callbackGasLimit, s_numWords);
		s_requests[requestId] = RequestStatus({fulfilled: false, exists: true, requestPurpose: requestPurpose, randomWords: new uint256[](0)});
		requestIds.push(requestId);
		lastRequestId = requestId;
		emit RequestSent(requestId, requestPurpose);
		return requestId;
	}

	/**
	 * @notice Fulfill a request processed by Chainlink VRF and returns the requested random words
	 * as callback data
	 */
	function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
		if (s_requests[_requestId].exists == false) {
			revert RequestNotFound(_requestId);
		}
		s_requestId = _requestId;
		s_randomWords = _randomWords;
		s_requestPurpose = s_requests[_requestId].requestPurpose;
		s_requests[s_requestId].fulfilled = true;
		s_requests[s_requestId].randomWords = s_randomWords;
		emit RequestFulfilled(s_requestId, s_randomWords, s_requestPurpose);
	}

	function getRequestStatus(uint256 requestId) external view returns (bool fulfilled, uint256[] memory randomWords, RequestPurpose requestPurpose) {
		if (s_requests[requestId].exists == false) {
			revert RequestNotFound(requestId);
		}
		RequestStatus memory requestStatus = s_requests[requestId];
		return (requestStatus.fulfilled, requestStatus.randomWords, requestStatus.requestPurpose);
	}

	// Create a new subscription when the contract is initially deployed.
	function createNewSubscription() internal onlyOwner returns (uint256 subscriptionId) {
		s_subscriptionId = COORDINATOR.createSubscription();
		// Add this contract as a consumer of its own subscription.
		COORDINATOR.addConsumer(s_subscriptionId, address(this));
		return s_subscriptionId;
	}

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

	function withdraw(uint256 amount, address to) external onlyOwner {
		LINKTOKEN.transfer(to, amount);
	}
}
