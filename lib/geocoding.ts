const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface Coordinates {
  latitude: number;
  longitude: number;
}

export async function getAddressFromCoordinates(coordinates: Coordinates): Promise<string> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.latitude},${coordinates.longitude}&key=${GOOGLE_MAPS_API_KEY}`
    );

    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      // Get the formatted address from the first result
      return data.results[0].formatted_address;
    }

    throw new Error('No address found for these coordinates');
  } catch (error) {
    console.error('Error getting address:', error);
    return 'Address not available';
  }
} 