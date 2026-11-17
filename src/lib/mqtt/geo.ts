function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceFeet(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusFeet = 20_902_231;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusFeet * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function feetToMeters(feet: number): number {
  return feet * 0.3048;
}
