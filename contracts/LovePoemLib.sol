//  SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

library LovePoemLib {
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
