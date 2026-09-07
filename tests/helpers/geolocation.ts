export function position(longitude = 5.34, latitude = 60.4, accuracy = 20): GeolocationPosition {
  return {
    coords: {
      longitude, latitude, accuracy,
      altitude: null, altitudeAccuracy: null, heading: null, speed: null,
      toJSON() {
        return { longitude, latitude, accuracy, altitude: null, altitudeAccuracy: null, heading: null, speed: null };
      },
    },
    timestamp: Date.now(),
    toJSON() { return { coords: this.coords.toJSON(), timestamp: this.timestamp }; },
  };
}
