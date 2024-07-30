//  SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @custom:deprecated
 * */
library LovePoemLib {
	uint256 constant ResaleDonationRatio = 50;

	enum RequestPurpose {
		UNLOCK_EXCLUSIVE_EXCESS,
		IN_CONCONERT_SURPRISE,
		UPDATE_STATUS
	}

	enum PhotoCard {
		UNLUCKY,
		BLUEMING,
		LULLABY
	}

	enum ExclusiveAccess {
		BEHIND_THE_SCENES,
		UNRELEASED_TRACKS
	}

	enum LetterToIU {
		YES,
		NO
	}

	struct LovePoem {
		PhotoCard photoCard;
		ExclusiveAccess exclusiveAccess;
		LetterToIU letterToIU;
	}
}
