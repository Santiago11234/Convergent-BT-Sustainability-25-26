/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 * 
 * There has to be a google maps api that does this... 
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get user's current location
 * Returns lat/long coordinates
 */
export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  // For now, return null - you can implement actual geolocation later
  // Using expo-location or similar
  return null;
}

/**
 * Default location (Austin, TX) for testing
 */
export const DEFAULT_LOCATION = {
  latitude: 30.2672,
  longitude: -97.7431,
};
