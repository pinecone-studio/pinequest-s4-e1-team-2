import { useState } from "react";
import { StyleSheet } from "react-native";
import * as Location from "expo-location";

import { Text, View } from "@/components/Themed";
import { useVoice } from "@/src/voice";

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

type SelfLocationTrackerProps = {
  addressText: string;
  errorMessage: string;
};

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type NearbyPlace = {
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  location?: {
    latitude?: number;
    longitude?: number;
  };
};

type PlaceInfo = {
  description: string; // ойролцоох барилга + зүг + зай
  district: string; // дүүрэг
  khoroo: string; // хороо
  street: string; // гудамж
};

function getAddressComponent(place: NearbyPlace, type: string): string {
  return (
    place.addressComponents?.find((c) => c.types?.includes(type))?.longText ??
    ""
  );
}

// Латин (романжуулсан) нэрийг дуудлагаар нь кирилл рүү хөрвүүлнэ — Chimege латин уншдаггүй.
// Ойролцоо боловч уншигдахуйц болгох зорилготой (ж: "Ikh Toiruu" → "их тойруу").
const LATIN_DIGRAPHS: [RegExp, string][] = [
  [/kh/g, "х"],
  [/ch/g, "ч"],
  [/sh/g, "ш"],
  [/ts/g, "ц"],
  [/yo/g, "ё"],
  [/yu/g, "ю"],
  [/ya/g, "я"],
  [/ye/g, "е"],
  [/uu/g, "уу"],
  [/oo/g, "оо"],
  [/ee/g, "ээ"],
  [/ii/g, "ий"],
  [/ai/g, "ай"],
  [/ei/g, "эй"],
  [/oi/g, "ой"],
  [/ui/g, "үй"],
];
const LATIN_SINGLE: Record<string, string> = {
  a: "а",
  b: "б",
  c: "к",
  d: "д",
  e: "э",
  f: "ф",
  g: "г",
  h: "х",
  i: "и",
  j: "ж",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  q: "к",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  w: "в",
  x: "кс",
  y: "й",
  z: "з",
  ö: "ө",
  ü: "ү",
};

// Англи хаягийн нийтлэг үгсийг дуудлагаар биш, монгол үгээр орчуулна (street → гудамж)
const ADDRESS_WORDS: [RegExp, string][] = [
  [/\bstreet\b/g, "гудамж"],
  [/\bst\b/g, "гудамж"],
  [/\bavenue\b/g, "өргөн чөлөө"],
  [/\bave\b/g, "өргөн чөлөө"],
  [/\broad\b/g, "зам"],
  [/\bdistrict\b/g, "дүүрэг"],
  [/\bbuilding\b/g, "барилга"],
];

function latinToCyrillic(text: string): string {
  if (!text) return text;
  let out = text.toLowerCase();
  // Эхлээд англи хаягийн үгсийг монгол үгээр солино
  for (const [re, rep] of ADDRESS_WORDS) out = out.replace(re, rep);
  // Үлдсэн латин үсгийг (нэр) дуудлагаар нь кирилл болгоно
  for (const [re, rep] of LATIN_DIGRAPHS) out = out.replace(re, rep);
  out = out.replace(/[a-zöü]/g, (ch) => LATIN_SINGLE[ch] ?? ch);
  return out;
}

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

const EMPTY_PLACE_INFO: PlaceInfo = {
  description: "",
  district: "",
  khoroo: "",
  street: "",
};

async function getPlaceInfo(
  latitude: number,
  longitude: number,
): Promise<PlaceInfo> {
  if (!GOOGLE_PLACES_API_KEY) {
    return EMPTY_PLACE_INFO;
  }

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchNearby",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask":
          "places.displayName,places.addressComponents,places.location",
      },
      body: JSON.stringify({
        maxResultCount: 5,
        rankPreference: "DISTANCE",
        // Монголоор (кирилл) буцаана — Chimege латин уншдаггүй
        languageCode: "mn",
        regionCode: "MN",
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
    return EMPTY_PLACE_INFO;
  }

  const data = (await response.json()) as { places?: NearbyPlace[] };
  const place = data.places?.find((item) => item.displayName?.text);

  if (!place) {
    return EMPTY_PLACE_INFO;
  }

  // Google-ийн addressComponents-аас (монголоор) дүүрэг/хороо/гудамжийг гаргана.
  // Дүүрэг/хороо кирилл байдаг; гудамж/барилгын нэр заримдаа латин тул кирилл рүү хөрвүүлнэ.
  const district = getAddressComponent(place, "administrative_area_level_2");
  const khoroo = getAddressComponent(place, "sublocality_level_1");
  const street = latinToCyrillic(getAddressComponent(place, "route"));

  let description = latinToCyrillic(place.displayName?.text ?? "");
  const placeLatitude = place.location?.latitude;
  const placeLongitude = place.location?.longitude;
  if (description && placeLatitude != null && placeLongitude != null) {
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
    description = `${description}, ${directionText}, ойролцоогоор ${distanceInMeters} метр`;
  }

  return { description, district, khoroo, street };
}

export function useSelfLocationTracker() {
  const { speak } = useVoice();
  const [addressText, setAddressText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGetLocation = async () => {
    setLoading(true);
    setErrorMessage("");
    setAddressText("");
    speak("Байршил тогтоож байна.");

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setErrorMessage("Байршлын зөвшөөрөл өгнө үү.");
        speak("Байршлын зөвшөөрөл өгнө үү.");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const latitude = currentLocation.coords.latitude;
      const longitude = currentLocation.coords.longitude;

      // Google Places-аас (монголоор/кирилл) дүүрэг/хороо/гудамж/ойролцоох барилга авна
      const placeInfo = await getPlaceInfo(latitude, longitude);

      // iOS reverse-geocode нь Google хоосон гарвал нөөц болно (заримдаа латин)
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      const address = addresses[0];

      // Google хоосон бол iOS geocode (заримдаа латин) рүү унана — латиныг кирилл болгоно
      const district =
        placeInfo.district || latinToCyrillic(address?.district ?? "");
      const khoroo =
        placeInfo.khoroo || latinToCyrillic(address?.subregion ?? "");
      const street = placeInfo.street || latinToCyrillic(address?.street ?? "");

      const accuracyMeters =
        currentLocation.coords.accuracy != null
          ? Math.round(currentLocation.coords.accuracy)
          : null;

      // Дараалал: дүүрэг → хороо → гудамж → ойролцоох барилга (зүг + метр) → нарийвчлал
      const fields = [
        district ? `${district}` : "",
        khoroo ? `${khoroo}` : "",
        street ? `${street}` : "",
        placeInfo.description
          ? `Ойролцоох барилга: ${placeInfo.description}`
          : "",
        accuracyMeters != null ? `Нарийвчлал: ${accuracyMeters} метр` : "",
      ].filter(Boolean);

      if (fields.length === 0) {
        setErrorMessage("Байршлын хаяг олдсонгүй.");
        return;
      }

      setAddressText(fields.join("\n"));
      speak("Та одоо энд байна. " + fields.join(". ") + ".");
    } catch {
      setErrorMessage("Байршил тогтооход алдаа гарлаа.");
      speak("Байршил тогтооход алдаа гарлаа.");
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
