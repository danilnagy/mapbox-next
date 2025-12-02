// import { BsFillTreeFill } from "react-icons/bs";
// import { IoRestaurantSharp, IoSchool, IoBoat } from "react-icons/io5";
// import { FaRoad } from "react-icons/fa";
// import { MdLocalGroceryStore, MdSportsTennis, MdStadium } from "react-icons/md";
// import { BiPlusMedical } from "react-icons/bi";
// import { LuFerrisWheel } from "react-icons/lu";
import { cva, VariantProps } from "class-variance-authority";
// import { cn } from "@/lib/utils";
import { parseDomainName } from "./utils";
import { getNormalizedCategory } from "./constants";
import useCachedLogo from "@/hooks/use-cached-logo";

// const getCategoryIcon = (category) =>
//   ({
//     park: BsFillTreeFill,
//     school: IoSchool,
//     hospital: BiPlusMedical,
//     retail: MdLocalGroceryStore,
//     recreation: MdSportsTennis,
//     roads: FaRoad,
//     restaurant: IoRestaurantSharp,
//     marina: IoBoat,
//     "amusement-park": LuFerrisWheel,
//     stadium: MdStadium,
//   })[category];

const categoryColour = {
  park: "green",
  school: "blue",
  hospital: "red",
  retail: "purple",
  recreation: "green",
  roads: "zinc",
  restaurant: "yellow",
  marina: "green",
  "amusement-park": "green",
  stadium: "green",
  other: "white",
};

const emblemVariants = cva("border-4 border-white bg-white", {
  variants: {
    variant: {
      circle: "size-12 rounded-full",
      rectangle: "aspect-[5/3] h-full w-24 rounded-md object-cover",
    },
    size: {
      "1": "size-9",
      "2": "size-10",
      "3": "size-11",
      "4": "size-12",
      "5": "size-16",
    },
    category: {
      park: `border-${categoryColour["park"]}-400`,
      school: `border-${categoryColour["school"]}-400`,
      hospital: `border-${categoryColour["hospital"]}-400`,
      retail: `border-${categoryColour["retail"]}-400`,
      recreation: `border-${categoryColour["recreation"]}-400`,
      roads: `border-${categoryColour["roads"]}-900`,
      restaurant: `border-${categoryColour["restaurant"]}-400`,
      marina: `border-${categoryColour["marina"]}-400`,
      stadium: `border-${categoryColour["stadium"]}-400`,
      "amusement-park": `border-${categoryColour["amusement-park"]}-400`,
      other: `border-${categoryColour["other"]}`,
    },
  },
  defaultVariants: {
    variant: "circle",
    category: "other",
  },
});

const emblemIconVariants = cva("", {
  variants: {
    size: {
      "1": "size-3",
      "2": "size-4",
      "3": "size-4",
      "4": "size-6",
      "5": "size-6",
    },
    radius: {
      "1": "rounded-sm",
      "2": "rounded-sm",
      "3": "rounded-md",
      "4": "rounded-md",
      "5": "rounded-lg",
    },
    category: {
      park: `text-${categoryColour["park"]}-900`,
      school: `text-${categoryColour["school"]}-900`,
      hospital: `text-${categoryColour["hospital"]}-900`,
      retail: `text-${categoryColour["retail"]}-900`,
      recreation: `text-${categoryColour["recreation"]}-900`,
      roads: `text-${categoryColour["roads"]}-100`,
      restaurant: `text-${categoryColour["restaurant"]}-900`,
      marina: `text-${categoryColour["marina"]}-900`,
      stadium: `text-${categoryColour["stadium"]}-900`,
      "amusement-park": `text-${categoryColour["amusement-park"]}-900`,
      other: "text-foreground",
    },
  },
});

const Emblem = ({
  variant,
  category,
  size,
  coverSrc,
  name,
  className,
  showLabel,
}: {
  variant?: VariantProps<typeof emblemVariants>["variant"];
  category?: VariantProps<typeof emblemVariants>["category"] | string;
  size: VariantProps<typeof emblemVariants>["size"];
  coverSrc: { photo?: string; logo?: string; website?: string };
  name: string;
  className?: string;
  showLabel?: boolean;
}) => {
  const { photo, logo, website } = coverSrc;

  const normalizedCategory = getNormalizedCategory(category || null);

  // const Icon = getCategoryIcon(normalizedCategory);

  // Build ONE canonical logo url (no timestamp!)
  const logoDevUrl =
    website && !logo && !photo
      ? `https://img.logo.dev/${parseDomainName(website)}?token=${
          process.env.NEXT_PUBLIC_LOGODEV_ACCESS_TOKEN
        }&format=jpg`
      : undefined;

  // Ask the cache for an object-URL (undefined while downloading)
  const cachedLogo = useCachedLogo(logoDevUrl);

  if (
    photo ||
    ["school", "park", "hospital", "stadium"].includes(normalizedCategory || "")
  ) {
    return (
      <div className="flex flex-col items-center opacity-100">
        <div className="relative">
          {/* eslint-disable-next-line */}
          {(photo || logo || website) && (
            <img
              src={
                photo ||
                logo ||
                cachedLogo /* falls back to undefined while loading */
              }
              alt={name}
              className={
                "aspect-[5/3] h-full w-24 rounded-md object-cover border-4 bg-cover shadow transition-opacity group-hover:border-red-700 group-hover:opacity-75 group-hover:shadow-xl"
              }
            />
          )}
          {/* {Icon && (
            <div
              className={cn(
                "absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
                `z-10 rounded-md p-1 shadow-lg`,
                normalizedCategory === "roads"
                  ? `bg-${categoryColour[normalizedCategory]}-900`
                  : `bg-${categoryColour[normalizedCategory]}-400`,
                emblemIconVariants({
                  category: normalizedCategory,
                  radius: size,
                }),
                "group-hover:opacity-0"
              )}
            >
              <Icon
                className={cn(
                  emblemIconVariants({
                    size,
                  })
                )}
              />
            </div>
          )} */}
        </div>
        {showLabel && (
          <div
            id="emblem-text"
            className="absolute top-14 mt-2 max-w-[120px] truncate rounded-full bg-black px-3 py-1 text-center text-xs font-semibold tracking-tight text-foreground shadow group-hover:z-50 group-hover:max-w-none group-hover:overflow-auto group-hover:whitespace-nowrap group-hover:bg-red-500 group-hover:shadow-xl"
          >
            {name}
          </div>
        )}
      </div>
    );
  }

  if ((website && cachedLogo) || logo) {
    return (
      <div className="flex flex-col items-center opacity-100">
        <div className="relative">
          {/*  eslint-disable-next-line */}
          <img
            src={logo ? logo : cachedLogo}
            alt={name}
            className={"bg-cover size-12 rounded-full"}
            crossOrigin="anonymous"
          />
          {/* {Icon && (
            <div
              className={cn(
                "absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
                `z-10 rounded-md p-1 shadow-lg`,
                normalizedCategory === "roads"
                  ? `bg-${categoryColour[normalizedCategory]}-900`
                  : `bg-${categoryColour[normalizedCategory]}-400`,
                emblemIconVariants({
                  category: normalizedCategory,
                  radius: size,
                }),
                "group-hover:opacity-0"
              )}
            >
              <Icon
                className={emblemIconVariants({
                  size,
                })}
              />
            </div>
          )} */}
        </div>
        {showLabel && (
          <div
            id="emblem-text"
            className="absolute top-10 mt-2 hidden max-w-[120px] truncate rounded-full bg-black px-3 py-1 text-center text-xs font-semibold tracking-tight text-foreground shadow group-hover:z-50 group-hover:block group-hover:max-w-none group-hover:overflow-auto group-hover:whitespace-nowrap group-hover:bg-red-500 group-hover:shadow-xl"
          >
            {name}
          </div>
        )}
      </div>
    );
  }

  return (
    <p
      id="emblem-text"
      className="relative max-w-full whitespace-nowrap rounded-full bg-black px-3 py-1 text-xs font-semibold tracking-tight text-foreground shadow-lg"
    >
      {name}
    </p>
  );
};

export default Emblem;

export type PlaceCategory = VariantProps<typeof emblemVariants>["category"];
export type PlaceRanking = VariantProps<typeof emblemVariants>["size"];
