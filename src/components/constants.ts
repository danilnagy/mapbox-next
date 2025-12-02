import { PlaceCategory } from "./emblem";

export const POI_CATEGORIES = ["park", "school", "hospital", "supermarket"];
// export const POI_EXCLUDED_CATEGORIES = [
//   "music school",
//   "driving school",
//   "language school",
// ];
// export const POI_EXCLUDED_WORDS = [
//   "hospice",
//   "dental",
//   "dentist",
//   "cbd",
//   "dojo",
//   "taekwondo",
//   "judo",
//   "jitsu",
//   "karate",
//   "martial arts",
//   "hq",
//   "training",
//   "strings",
//   "studio",
//   "music",
//   "lessons",
//   "recording",
//   "guitar",
//   "piano",
//   "liquor",
// ];

const POI_NORMALIZED_CATEGORIES = {
  retail: ["store", "supermarket", "bakery", "grocery"],
  restaurant: ["restaurant", "food", "_shop"],
  park: ["garden", "_park", "outdoors"],
  school: ["university", "school", "education"],
  hospital: ["clinic", "health services"],
  roads: ["highway"],
  marina: [],
  other: [],
  recreation: ["sports ground"],
  stadium: [],
  "amusement-park": [],
};

// const POI_NORMALIZED_CATEGORY_RANKINGS = {
//   retail: 2,
//   roads: 2,
//   recreation: 2,
//   restaurant: 1,
//   park: 4,
//   stadium: 4,
//   school: 5,
//   hospital: 5,
//   other: 1,
//   marina: 3,
//   "amusement-park": 3,
// } as Record<PlaceCategory, [1, 2, 3, 4, 5][number]>;

export const getNormalizedCategory = (
  requestedCategory: string | null
): PlaceCategory => {
  if (!requestedCategory) return "other";

  const normalizedCategory = Object.entries(POI_NORMALIZED_CATEGORIES).find(
    ([ours, theirs]) =>
      requestedCategory === ours ||
      theirs.some((keyword) => requestedCategory.includes(keyword))
  )?.[0] as PlaceCategory;

  if (!normalizedCategory) {
    console.log(
      `[Category Mapping Error]: No normalized mapping available for:  ${requestedCategory}`
    );
    return "other";
  }

  return normalizedCategory;
};

// export const getNormalizedCategoryRanking = (normalizedCategory) =>
//   POI_NORMALIZED_CATEGORY_RANKINGS[normalizedCategory];

// export const INITIAL_VIEW_PROPS = {
//   center: {
//     lat: 34.113285310812074,
//     lng: -97.91742728695407,
//     altitude: 1440.6947586897245,
//   },
//   range: 3721313.8273894787,
//   heading: 4.32100514153742,
//   tilt: 51.76353234796065,
//   roll: 0,
// };
