import type { MemoryLocation, MemoryWeather } from '../models/memory';

export async function searchPlaces(query: string): Promise<MemoryLocation[]> {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
  );
  if (!response.ok) return [];
  const body = (await response.json()) as {
    results?: {
      name?: string;
      admin1?: string;
      admin2?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
    }[];
  };
  return (body.results ?? []).flatMap((hit) => {
    if (typeof hit.latitude !== 'number' || typeof hit.longitude !== 'number') return [];
    const district = preferredDistrict([hit.admin2, hit.admin1]);
    const name = [hit.name, district, hit.admin1, hit.country]
      .filter((part, index, all) => part && all.indexOf(part) === index)
      .join(', ');
    return [{ name, lat: hit.latitude, lng: hit.longitude, ...(district ? { district } : {}) }];
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<MemoryLocation> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en&zoom=12`
    );
    if (!response.ok) return { name: coordLabel(lat, lng), lat, lng };
    const body = (await response.json()) as {
      display_name?: string;
      address?: { state_district?: string; county?: string; city_district?: string; state?: string };
    };
    const district = preferredDistrict([
      body.address?.state_district,
      body.address?.county,
      body.address?.city_district,
      body.address?.state,
    ]);
    const name = String(body.display_name ?? '')
      .split(',')
      .slice(0, 3)
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', ');
    return { name: name || coordLabel(lat, lng), lat, lng, ...(district ? { district } : {}) };
  } catch {
    return { name: coordLabel(lat, lng), lat, lng };
  }
}

export async function weatherFor(lat: number, lng: number, day: string): Promise<MemoryWeather | null> {
  const target = new Date(`${day}T12:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const age = Date.now() - target.getTime();
  const recent = age < 8 * 86_400_000 && age > -2 * 86_400_000;
  const base = recent ? 'https://api.open-meteo.com/v1/forecast' : 'https://archive-api.open-meteo.com/v1/archive';
  try {
    const response = await fetch(
      `${base}?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${day}&end_date=${day}`
    );
    if (!response.ok) return null;
    const body = (await response.json()) as {
      daily?: { weather_code?: number[]; temperature_2m_max?: number[]; temperature_2m_min?: number[] };
    };
    const code = body.daily?.weather_code?.[0];
    const max = body.daily?.temperature_2m_max?.[0];
    const min = body.daily?.temperature_2m_min?.[0];
    if (typeof code !== 'number' || typeof max !== 'number') return null;
    const temp = typeof min === 'number' ? Math.round((max + min) / 2) : Math.round(max);
    const described = describe(code);
    return {
      temp,
      condition: described.condition,
      stringRepresentation: `${described.emoji} ${temp}°C ${described.condition}`,
    };
  } catch {
    return null;
  }
}

export function districtLabel(location: { name?: string; district?: string } | null | undefined) {
  const stored = location?.district?.trim();
  if (stored) return stored;
  return districtFromParts(String(location?.name ?? '').split(',')) || 'Place';
}

function preferredDistrict(parts: Array<string | undefined>) {
  const clean = parts.map((part) => part?.trim() ?? '').filter(Boolean);
  return clean.find((part) => /\bdistrict\b/i.test(part)) || clean[0] || '';
}

function districtFromParts(parts: Array<string | undefined>) {
  const clean = parts.map((part) => part?.trim() ?? '').filter(Boolean);
  const named = clean.find((part) => /\bdistrict\b/i.test(part));
  if (named) return named;
  const admin = clean.find((part, index) => index > 0 && !isCountry(part));
  if (admin && clean.length >= 3) return admin;
  return clean[0] ?? '';
}

function isCountry(value: string) {
  return /^(sri lanka|india|japan|united states|usa|uk|united kingdom|france|germany|australia|canada)$/i.test(
    value
  );
}

function coordLabel(lat: number, lng: number) {
  return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`;
}

function describe(code: number) {
  if (code === 0) return { condition: 'Clear', emoji: '☀️' };
  if (code <= 3) return { condition: 'Cloudy', emoji: '☁️' };
  if (code <= 48) return { condition: 'Fog', emoji: '🌫️' };
  if (code <= 67) return { condition: 'Rainy', emoji: '🌧️' };
  if (code <= 77) return { condition: 'Snow', emoji: '❄️' };
  if (code <= 82) return { condition: 'Showers', emoji: '🌦️' };
  if (code <= 86) return { condition: 'Snow', emoji: '❄️' };
  return { condition: 'Storm', emoji: '⛈️' };
}
