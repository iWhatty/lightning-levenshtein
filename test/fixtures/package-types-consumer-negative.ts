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

// @ts-expect-error distance arguments must be strings
distance(1, "sitting");
// @ts-expect-error distanceMax maxDistance must be a number
distanceMax("kitten", "sitting", "3");
// @ts-expect-error closest candidates must be strings
closest("kitten", ["sitting", 3]);

// @ts-expect-error min distance arguments must be strings
minDistance("kitten", false);
// @ts-expect-error min distanceMax maxDistance must be a number
minDistanceMax("kitten", "sitting", {});
// @ts-expect-error min closest maxDistance must be a number
minClosest("kitten", ["sitting"], "3");

// @ts-expect-error v2 arguments must be strings
levenshteinLightning("kitten", 3);
// @ts-expect-error v2/min arguments must be strings
minLevenshteinLightning({}, "sitting");

// @ts-expect-error Unicode distance arguments must be strings
distanceUnicode("café", undefined);
// @ts-expect-error Unicode min distance arguments must be strings
minDistanceUnicode([], "cafe");

// @ts-expect-error profile must be a supported profile name
createDistance({ profile: "utf8" });
// @ts-expect-error outOfRange must be a supported policy
createDistance({ profile: "ascii", outOfRange: "ignore" });
// @ts-expect-error profiles/min requires profile options
createDistanceMin({ outOfRange: "throw" });
