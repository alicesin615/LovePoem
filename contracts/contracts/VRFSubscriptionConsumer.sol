//  SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import "./LovePoemLib.sol";

contract VRFSubscriptionConsumer is VRFConsumerBaseV2Plus {
	uint256 s_subscriptionId;
	bytes32 s_keyHash;
	uint16 s_requestConfirmations;
	uint32 s_callbackGasLimit;
	uint32 s_numWords;

	event RequestSent(uint256 requestId, uint32 numWords);
	event RequestFulfilled(uint256 requestId, uint256[] randomWords);

	struct RequestStatus {
		bool fulfilled;
		bool exists;
		LovePoemLib.RequestPurpose requestPurpose;
		uint256[] randomWords;
	}

	mapping(uint256 => RequestStatus) public s_requests; /* requestId --> requestStatus */
	uint256[] public requestIds;
	uint256 public lastRequestId;

	constructor(
		address _vrfCoordinator,
		uint256 subscriptionId,
		bytes32 keyHash,
		uint16 requestConfirmations,
		uint32 callbackGasLimit,
		uint32 numWords
	) VRFConsumerBaseV2Plus(_vrfCoordinator) {
		s_subscriptionId = subscriptionId;
		s_keyHash = keyHash;
		s_requestConfirmations = requestConfirmations;
		s_callbackGasLimit = callbackGasLimit;
		s_numWords = numWords;
	}

	/**
	 * @param enableNativePayment: Set to `true` to enable payment in native tokens, or `false` to pay in LINK
	 **/
	function requestRandomWords(
		bool enableNativePayment,
		LovePoemLib.RequestPurpose requestPurpose
	) external onlyOwner returns (uint256 requestId) {
		// Will revert if subscription is not set and funded.
		requestId = s_vrfCoordinator.requestRandomWords(
			VRFV2PlusClient.RandomWordsRequest({
				keyHash: s_keyHash,
				subId: s_subscriptionId,
				requestConfirmations: s_requestConfirmations,
				callbackGasLimit: s_callbackGasLimit,
				numWords: s_numWords,
				extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: enableNativePayment}))
			})
		);
		s_requests[requestId] = RequestStatus({
			fulfilled: false,
			exists: true,
			requestPurpose: requestPurpose,
			randomWords: new uint256[](0)
		});
		requestIds.push(requestId);
		lastRequestId = requestId;
		emit RequestSent(requestId, s_numWords);
		return requestId;
	}

	function fulfillRandomWords(uint256 _requestId, uint256[] calldata _randomWords) internal override {
		require(s_requests[_requestId].exists, "request not found");
		s_requests[_requestId].fulfilled = true;
		s_requests[_requestId].randomWords = _randomWords;
		emit RequestFulfilled(_requestId, _randomWords);
	}

	function getRequestStatus(
		uint256 _requestId
	) external view returns (bool fulfilled, uint256[] memory randomWords, LovePoemLib.RequestPurpose requestPurpose) {
		require(s_requests[_requestId].exists, "request not found");
		RequestStatus memory request = s_requests[_requestId];
		return (request.fulfilled, request.randomWords, request.requestPurpose);
	}
}
