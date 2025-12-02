export const parseDomainName = (place: any | string) => {
  const re = new RegExp(
    "^(?:https?://)?(?:[^@/\n]+@)?(?:www.)?([^:/?\n]+)",
    "gim"
  );
  if (typeof place === "string") {
    const domain = re.exec(place);
    return domain[1];
  }

  if (!place.websiteURI) return null;
  const domain = re.exec(place.websiteURI);

  return domain[1];
};

export const milesToMeters = (miles) => miles * 1609.34;
