import * as Location from 'expo-location';

export async function requestLocationPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
}

export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    try {
        const location = await Location.getCurrentPositionAsync({});
        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        };
    } catch (error) {
        console.warn('Error getting location', error);
        return null;
    }
}

export async function reverseGeocode(lat: number, lng: number): Promise<{ city: string; state: string } | null> {
    try {
        const [result] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (result) {
            return {
                city: result.city || result.subregion || 'Unknown City',
                state: result.region || result.administrativeArea || 'Unknown State', // 'region' is standard on iOS, 'administrativeArea' on Android sometimes varies
            };
        }
        return null;
    } catch (error) {
        console.warn('Error reverse geocoding', error);
        return null;
    }
}
