import { useState } from "react";
import { StyleSheet } from "react-native";
import * as Location from "expo-location";

import { Text, View } from "@/components/Themed";

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

type SelfLocationTrackerProps = {
  addressText: string;
  errorMessage: string;
};

type NearbyPlace = {
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
};

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function getDistanceInMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) {
  const earthRadiusInMeters = 6371000;
  const latitudeDistance = toRadians(toLatitude - fromLatitude);
  const longitudeDistance = toRadians(toLongitude - fromLongitude);
  const fromLatitudeRadians = toRadians(fromLatitude);
  const toLatitudeRadians = toRadians(toLatitude);

  const haversine =
    Math.sin(latitudeDistance / 2) * Math.sin(latitudeDistance / 2) +
    Math.cos(fromLatitudeRadians) *
      Math.cos(toLatitudeRadians) *
      Math.sin(longitudeDistance / 2) *
      Math.sin(longitudeDistance / 2);
  const angularDistance =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return Math.round(earthRadiusInMeters * angularDistance);
}

function getDirectionText(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) {
  const fromLatitudeRadians = toRadians(fromLatitude);
  const toLatitudeRadians = toRadians(toLatitude);
  const longitudeDifference = toRadians(toLongitude - fromLongitude);

  const y = Math.sin(longitudeDifference) * Math.cos(toLatitudeRadians);
  const x =
    Math.cos(fromLatitudeRadians) * Math.sin(toLatitudeRadians) -
    Math.sin(fromLatitudeRadians) *
      Math.cos(toLatitudeRadians) *
      Math.cos(longitudeDifference);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  const normalizedBearing = (bearing + 360) % 360;

  if (normalizedBearing >= 337.5 || normalizedBearing < 22.5)
    return "хойд зүгт";
  if (normalizedBearing < 67.5) return "зүүн хойд зүгт";
  if (normalizedBearing < 112.5) return "зүүн зүгт";
  if (normalizedBearing < 157.5) return "зүүн урд зүгт";
  if (normalizedBearing < 202.5) return "урд зүгт";
  if (normalizedBearing < 247.5) return "баруун урд зүгт";
  if (normalizedBearing < 292.5) return "баруун зүгт";
  return "баруун хойд зүгт";
}

async function getNearbyPlaceDescription(latitude: number, longitude: number) {
  if (!GOOGLE_PLACES_API_KEY) {
    return "";
  }

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchNearby",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({
        maxResultCount: 5,
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: {
            center: {
              latitude,
              longitude,
            },
            radius: 100,
          },
        },
      }),
    },
  );

  if (!response.ok) {
    return "";
  }

  const data = (await response.json()) as { places?: NearbyPlace[] };
  const place = data.places?.find((item) => item.displayName?.text);

  if (!place?.displayName?.text) {
    return "";
  }

  const placeLatitude = place.location?.latitude;
  const placeLongitude = place.location?.longitude;

  if (placeLatitude == null || placeLongitude == null) {
    return place.displayName.text;
  }

  const directionText = getDirectionText(
    latitude,
    longitude,
    placeLatitude,
    placeLongitude,
  );
  const distanceInMeters = getDistanceInMeters(
    latitude,
    longitude,
    placeLatitude,
    placeLongitude,
  );

  return `${place.displayName.text} - ${directionText}, ойролцоогоор ${distanceInMeters}м`;
}

export function useSelfLocationTracker() {
  const [addressText, setAddressText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGetLocation = async () => {
    setLoading(true);
    setErrorMessage("");
    setAddressText("");

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setErrorMessage("Байршлын зөвшөөрөл өгнө үү.");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const latitude = currentLocation.coords.latitude;
      const longitude = currentLocation.coords.longitude;

      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      const address = addresses[0];

      if (!address) {
        setErrorMessage("Байршлын хаяг олдсонгүй.");
        return;
      }

      const nearbyPlaceDescription = await getNearbyPlaceDescription(
        latitude,
        longitude,
      );

      const readableAddress = [
        address.district ? `Дүүрэг: ${address.district}` : "",
        address.subregion ? `Хороо/бүс: ${address.subregion}` : "",
        address.city ? `Хот: ${address.city}` : "",
        address.street ? `Гудамж: ${address.street}` : "",
        address.streetNumber ? `Дугаар: ${address.streetNumber}` : "",
        address.name ? `Хаягийн нэр: ${address.name}` : "",
        nearbyPlaceDescription
          ? `Ойролцоох барилга/газар: ${nearbyPlaceDescription}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      const accuracyText =
        currentLocation.coords.accuracy != null
          ? `Нарийвчлал: ${Math.round(currentLocation.coords.accuracy)}м`
          : "Нарийвчлал тодорхойгүй";

      setAddressText(`${readableAddress}\n${accuracyText}`);
    } catch {
      setErrorMessage("Байршил тогтооход алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };

  return {
    addressText,
    errorMessage,
    handleGetLocation,
    loading,
  };
}

export default function SelfLocationTracker({
  addressText,
  errorMessage,
}: SelfLocationTrackerProps) {
  return (
    <View style={styles.container}>
      {addressText ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>Таны байршил</Text>
          <Text style={styles.resultText}>{addressText}</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  result: {
    padding: 16,
    gap: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  resultText: {
    fontSize: 16,
    lineHeight: 24,
  },
  errorText: {
    padding: 16,
    color: "#d00",
    fontSize: 16,
  },
});
