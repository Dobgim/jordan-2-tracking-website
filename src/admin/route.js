import { loadGoogleMaps } from '../lib/googleMaps.js';
import { LAND_FREIGHT } from '../lib/tracking.js';

/**
 * Locates origin and destination and works out the route the package follows:
 * the real road route for truck/train freight, the great-circle line for sea
 * and air. Returns the fields stored on the shipment.
 */
export async function locateRoute({ origin, destination, freightType }, apiKey) {
  const google = await loadGoogleMaps(apiKey);
  const geocoder = new google.maps.Geocoder();

  const geocode = async (address, label) => {
    try {
      const { results } = await geocoder.geocode({ address });
      if (!results?.length) throw new Error('no results');
      return results[0].geometry.location;
    } catch {
      throw new Error(`Couldn't find the ${label} "${address}" on the map. Try adding the city and country.`);
    }
  };

  const [a, b] = await Promise.all([geocode(origin.trim(), 'origin'), geocode(destination.trim(), 'destination')]);
  const result = {
    originLat: a.lat(),
    originLng: a.lng(),
    destLat: b.lat(),
    destLng: b.lng(),
    routePolyline: null,
    routeDistanceKm: null,
    note: '',
  };

  if (LAND_FREIGHT.includes(freightType)) {
    try {
      const response = await new google.maps.DirectionsService().route({
        origin: a,
        destination: b,
        travelMode: google.maps.TravelMode.DRIVING,
      });
      const route = response.routes[0];
      result.routePolyline = typeof route.overview_polyline === 'string' ? route.overview_polyline : route.overview_polyline?.points || null;
      result.routeDistanceKm = Math.round(route.legs.reduce((m, leg) => m + leg.distance.value, 0) / 100) / 10;
    } catch {
      result.note = 'There is no road route between these places, so the map shows a direct line.';
    }
  }

  if (!result.routeDistanceKm || !result.routePolyline) {
    result.routePolyline = null;
    result.routeDistanceKm = Math.round(google.maps.geometry.spherical.computeDistanceBetween(a, b) / 100) / 10;
  }
  return result;
}
