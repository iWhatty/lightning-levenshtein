import { closest, distance, distanceMax } from "lightning-levenshtein";
import {
  closest as minClosest,
  distance as minDistance,
  distanceMax as minDistanceMax,
} from "lightning-levenshtein/min";
import { levenshteinLightning } from "lightning-levenshtein/v2";
import { levenshteinLightning as minLevenshteinLightning } from "lightning-levenshtein/v2/min";
import { distanceUnicode } from "lightning-levenshtein/unicode";
import { distanceUnicode as minDistanceUnicode } from "lightning-levenshtein/unicode/min";
import { createDistance } from "lightning-levenshtein/profiles";
import { createDistance as createDistanceMin } from "lightning-levenshtein/profiles/min";
import type {
  DistanceProfileOptions,
  OutOfRangePolicy,
  TextProfile,
} from "lightning-levenshtein/profiles";
import type {
  DistanceProfileOptions as MinDistanceProfileOptions,
  OutOfRangePolicy as MinOutOfRangePolicy,
  TextProfile as MinTextProfile,
} from "lightning-levenshtein/profiles/min";

const first: string = "kitten";
const second: string = "sitting";

const rootDistance: number = distance(first, second);
const rootDistanceMax: number = distanceMax(first, second, 3);
const rootClosest: string | null = closest(first, [second, first], 3);

const minDistanceResult: number = minDistance(first, second);
const minDistanceMaxResult: number = minDistanceMax(first, second);
const minClosestResult: string | null = minClosest(first, [second, first]);

const v2Distance: number = levenshteinLightning(first, second);
const v2MinDistance: number = minLevenshteinLightning(first, second);

const unicodeDistance: number = distanceUnicode("café", "café");
const unicodeMinDistance: number = minDistanceUnicode("😀", "😃");

const profile: TextProfile = "ascii";
const policy: OutOfRangePolicy = "throw";
const profileOptions: DistanceProfileOptions = { profile, outOfRange: policy };
const profileDistance = createDistance(profileOptions);
const profileResult: number = profileDistance(first, second);

const minProfile: MinTextProfile = "codeUnit";
const minPolicy: MinOutOfRangePolicy = "assume-valid";
const minProfileOptions: MinDistanceProfileOptions = {
  profile: minProfile,
  outOfRange: minPolicy,
};
const minProfileDistance = createDistanceMin(minProfileOptions);
const minProfileResult: number = minProfileDistance(first, second);

void [
  rootDistance, rootDistanceMax, rootClosest,
  minDistanceResult, minDistanceMaxResult, minClosestResult,
  v2Distance, v2MinDistance, unicodeDistance, unicodeMinDistance,
  profileResult, minProfileResult,
];
