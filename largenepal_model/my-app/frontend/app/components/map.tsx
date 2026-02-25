import { useState, useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle, Accessibility, Search, X, Navigation, Clock, Ruler,
  Download, Share2, ChevronDown, ChevronUp, Info, Map, Satellite, 
  Mountain, Moon, MapPin, Flag, AlertCircle, CheckCircle,
  Circle, Triangle, ArrowRight, ArrowLeft, ChevronRight,
  Camera, Shield, ShieldAlert, ShieldCheck, Layers, Menu,
  Home, User, Settings, HelpCircle, BarChart, BookOpen,
  Wifi, WifiOff, Navigation2, Target, Compass
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface RouteSegment {
  coordinates: [number, number][];
  accessibility: 'safe' | 'caution' | 'hazard';
  surface?: string;
  incline?: number;
  description?: string;
}

interface RouteResult {
  segments: RouteSegment[];
  totalDistance: number;
  estimatedTime: number;
  warnings: string[];
  elevationProfile?: { distance: number; elevation: number }[];
}

interface HazardPoint {
  lat: number;
  lng: number;
  type: 'hazard' | 'caution';
  category: string;
  description: string;
}

interface SearchResult {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
  accessibilityScore: number;
}

interface IssueReport {
  id: string;
  lat: number;
  lng: number;
  type: 'blocked_sidewalk' | 'broken_ramp' | 'construction' | 'pothole' | 'other';
  description: string;
  timestamp: string;
}

interface SavedLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'home' | 'work' | 'favorite' | 'recent';
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const TILE_LAYERS: Record<string, { url: string; attribution: string }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CartoDB © OSM contributors',
  },
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap',
  },
};

const ROUTE_COLORS = { 
  safe: '#10b981', 
  caution: '#f59e0b', 
  hazard: '#ef4444' 
};

const MAP_STYLES = [
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'streets', label: 'Streets', icon: Map },
  { id: 'satellite', label: 'Satellite', icon: Satellite },
  { id: 'terrain', label: 'Terrain', icon: Mountain },
];

const ISSUE_TYPES = [
  { value: 'blocked_sidewalk' as const, label: 'Blocked Sidewalk', icon: AlertTriangle },
  { value: 'broken_ramp' as const, label: 'Broken Ramp', icon: AlertCircle },
  { value: 'construction' as const, label: 'Construction', icon: Triangle },
  { value: 'pothole' as const, label: 'Pothole', icon: Circle },
  { value: 'other' as const, label: 'Other', icon: AlertCircle },
];

const STORAGE_KEY = 'wheelchair-nav-reports';
const SAVED_LOCATIONS_KEY = 'wheelchair-nav-locations';

const KATHMANDU_CENTER = { lat: 27.7172, lng: 85.324 };

// ═══════════════════════════════════════════════════════════
// HAZARD FETCHING FUNCTIONS
// ═══════════════════════════════════════════════════════════

async function fetchHazards(lat = 27.7172, lng = 85.324, radius = 3000): Promise<HazardPoint[]> {
  try {
    const query = `
      [out:json][timeout:15];
      (
        way["highway"="steps"](around:${radius},${lat},${lng});
        way["highway"="construction"](around:${radius},${lat},${lng});
        way["surface"="unpaved"](around:${radius},${lat},${lng});
        way["surface"="gravel"](around:${radius},${lat},${lng});
        way["smoothness"="bad"](around:${radius},${lat},${lng});
        way["smoothness"="very_bad"](around:${radius},${lat},${lng});
        way["highway"="living_street"](around:${radius},${lat},${lng});
        way["highway"="service"]["width"](around:${radius},${lat},${lng});
      );
      out center;
    `;
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'WheelchairNavKTM/1.0'
      },
    });
    
    if (!response.ok) throw new Error('Overpass API error');
    
    const data = await response.json();
    return parseOverpassData(data);
  } catch (error) {
    console.warn('Overpass API unavailable, using mock hazards:', error);
    return getMockHazards(lat, lng);
  }
}

function parseOverpassData(data: any): HazardPoint[] {
  const points: HazardPoint[] = [];
  
  for (const element of data.elements || []) {
    const lat = element.center?.lat || element.lat;
    const lng = element.center?.lon || element.lon;
    
    if (!lat || !lng) continue;
    
    const tags = element.tags || {};
    let type: 'hazard' | 'caution' = 'caution';
    let category = 'Unknown';
    let description = '';
    
    if (tags.highway === 'steps') { 
      type = 'hazard'; 
      category = 'Stairs'; 
      description = 'Stairs detected — not wheelchair accessible'; 
    }
    else if (tags.highway === 'construction') { 
      type = 'hazard'; 
      category = 'Construction'; 
      description = 'Road under construction'; 
    }
    else if (['unpaved', 'gravel'].includes(tags.surface)) { 
      type = 'hazard'; 
      category = 'Unpaved'; 
      description = `Surface: ${tags.surface}`; 
    }
    else if (['bad', 'very_bad'].includes(tags.smoothness)) { 
      type = 'hazard'; 
      category = 'Poor Surface'; 
      description = `Smoothness: ${tags.smoothness}`; 
    }
    else if (tags.highway === 'living_street') { 
      type = 'caution'; 
      category = 'Narrow Alley'; 
      description = 'Narrow living street — limited wheelchair access'; 
    }
    else if (tags.highway === 'service') { 
      type = 'caution'; 
      category = 'Service Road'; 
      description = 'Service road — may be narrow'; 
    }
    
    points.push({ lat, lng, type, category, description });
  }
  
  return points;
}

function getMockHazards(centerLat: number, centerLng: number): HazardPoint[] {
  return [
    { lat: centerLat + 0.003, lng: centerLng + 0.002, type: 'hazard', category: 'Stairs', description: 'Steep stairs near temple area' },
    { lat: centerLat - 0.004, lng: centerLng + 0.005, type: 'hazard', category: 'Construction', description: 'Road construction zone' },
    { lat: centerLat + 0.006, lng: centerLng - 0.003, type: 'hazard', category: 'Unpaved', description: 'Gravel road — poor surface' },
    { lat: centerLat - 0.002, lng: centerLng - 0.004, type: 'hazard', category: 'Steep Incline', description: 'Incline > 10% — avoid' },
    { lat: centerLat + 0.001, lng: centerLng + 0.007, type: 'hazard', category: 'Pothole', description: 'Large potholes reported' },
    { lat: centerLat - 0.005, lng: centerLng + 0.001, type: 'caution', category: 'Narrow Alley', description: 'Narrow alley — width < 2m' },
    { lat: centerLat + 0.004, lng: centerLng - 0.006, type: 'caution', category: 'Narrow Alley', description: 'Limited sidewalk width' },
    { lat: centerLat - 0.001, lng: centerLng + 0.004, type: 'caution', category: 'Poor Sidewalk', description: 'Broken sidewalk surface' },
    { lat: centerLat + 0.005, lng: centerLng + 0.003, type: 'caution', category: 'Service Road', description: 'Service road — limited access' },
    { lat: centerLat - 0.003, lng: centerLng - 0.002, type: 'caution', category: 'Semi-accessible', description: 'Partial wheelchair access only' },
  ];
}

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS: Search with better error handling
// ═══════════════════════════════════════════════════════════

async function searchPlaces(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];
  
  try {
    // Try with Kathmandu bounding box first
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1&countrycodes=np&viewbox=85.2,27.8,85.45,27.6&bounded=1`;
    
    const response = await fetch(url, { 
      headers: { 
        'User-Agent': 'WheelchairNavKTM/1.0',
        'Accept-Language': 'en'
      } 
    });
    
    if (!response.ok) throw new Error('Nominatim error');
    
    const data = await response.json();
    
    if (data.length === 0) {
      // Fallback: search without bounding box
      const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' Kathmandu Nepal')}&limit=8&addressdetails=1`;
      const fallbackResponse = await fetch(fallbackUrl, { 
        headers: { 'User-Agent': 'WheelchairNavKTM/1.0' } 
      });
      if (!fallbackResponse.ok) throw new Error('Fallback error');
      const fallbackData = await fallbackResponse.json();
      return parseNominatimResults(fallbackData);
    }
    
    return parseNominatimResults(data);
  } catch (error) {
    console.warn('Search error:', error);
    // Return mock results for demo purposes
    return getMockSearchResults(query);
  }
}

function parseNominatimResults(data: any[]): SearchResult[] {
  return data.map((item: any) => {
    // Extract a clean name
    let name = item.display_name?.split(',')[0] || 'Unknown';
    if (item.address?.road) name = item.address.road;
    if (item.address?.amenity) name = item.address.amenity;
    if (item.address?.tourism) name = item.address.tourism;
    
    return {
      id: item.place_id?.toString() || Math.random().toString(),
      name: name,
      displayName: item.display_name || 'Unknown place',
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type || 'place',
      accessibilityScore: calculateAccessibilityScore(item),
    };
  });
}

function calculateAccessibilityScore(item: any): number {
  const type = item.type || '';
  const category = item.category || '';
  
  // Higher scores for typically accessible places
  if (['hospital', 'clinic'].includes(type)) return 8;
  if (['hotel', 'hostel'].includes(type)) return 7;
  if (['mall', 'supermarket', 'department_store'].includes(type)) return 8;
  if (['airport', 'bus_station', 'train_station'].includes(type)) return 7;
  if (['restaurant', 'cafe', 'fast_food'].includes(type)) return 6;
  if (['bank', 'post_office', 'library'].includes(type)) return 7;
  if (['school', 'university', 'college'].includes(type)) return 6;
  if (['place_of_worship', 'temple', 'church'].includes(type)) return 4;
  if (['historic', 'attraction', 'viewpoint'].includes(type)) return 3;
  
  // Default random score for other places
  return Math.floor(Math.random() * 5) + 3;
}

function getMockSearchResults(query: string): SearchResult[] {
  const lowerQuery = query.toLowerCase();
  const mockPlaces = [
    { name: 'Kathmandu Durbar Square', lat: 27.704, lng: 85.307, type: 'historic', score: 4 },
    { name: 'Patan Durbar Square', lat: 27.673, lng: 85.325, type: 'historic', score: 4 },
    { name: 'Swayambhunath Stupa', lat: 27.715, lng: 85.290, type: 'temple', score: 3 },
    { name: 'Boudhanath Stupa', lat: 27.721, lng: 85.362, type: 'temple', score: 4 },
    { name: 'Pashupatinath Temple', lat: 27.710, lng: 85.348, type: 'temple', score: 3 },
    { name: 'Garden of Dreams', lat: 27.716, lng: 85.317, type: 'park', score: 8 },
    { name: 'Thamel', lat: 27.715, lng: 85.311, type: 'tourism', score: 6 },
    { name: 'Civil Mall', lat: 27.696, lng: 85.318, type: 'mall', score: 8 },
    { name: 'Bhatbhateni Supermarket', lat: 27.709, lng: 85.322, type: 'supermarket', score: 7 },
    { name: 'Kathmandu Medical College', lat: 27.725, lng: 85.332, type: 'hospital', score: 8 },
    { name: 'Tribhuvan University', lat: 27.683, lng: 85.287, type: 'university', score: 6 },
    { name: 'Nepal Tourism Board', lat: 27.715, lng: 85.316, type: 'office', score: 7 },
    { name: 'Kathmandu Airport', lat: 27.696, lng: 85.359, type: 'airport', score: 7 },
    { name: 'Bus Park', lat: 27.724, lng: 85.316, type: 'bus_station', score: 5 },
  ];
  
  return mockPlaces
    .filter(place => place.name.toLowerCase().includes(lowerQuery))
    .map(place => ({
      id: Math.random().toString(),
      name: place.name,
      displayName: `${place.name}, Kathmandu`,
      lat: place.lat,
      lng: place.lng,
      type: place.type,
      accessibilityScore: place.score,
    }));
}

// ═══════════════════════════════════════════════════════════
// LOCATION SERVICES
// ═══════════════════════════════════════════════════════════

async function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const response = await fetch(url, { 
      headers: { 'User-Agent': 'WheelchairNavKTM/1.0' } 
    });
    if (!response.ok) throw new Error('Reverse geocoding failed');
    const data = await response.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS: Reports
// ═══════════════════════════════════════════════════════════

function getReports(): IssueReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveReport(report: Omit<IssueReport, 'id' | 'timestamp'>): IssueReport {
  const newReport: IssueReport = {
    ...report,
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
  };
  const reports = getReports();
  reports.push(newReport);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  return newReport;
}

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS: Saved Locations
// ═══════════════════════════════════════════════════════════

function getSavedLocations(): SavedLocation[] {
  try {
    const raw = localStorage.getItem(SAVED_LOCATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocation(location: Omit<SavedLocation, 'id'>): SavedLocation {
  const newLocation: SavedLocation = {
    ...location,
    id: Math.random().toString(36).substr(2, 9),
  };
  const locations = getSavedLocations();
  locations.push(newLocation);
  localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(locations));
  return newLocation;
}

function deleteLocation(id: string): void {
  const locations = getSavedLocations().filter(loc => loc.id !== id);
  localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(locations));
}

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS: Routing
// ═══════════════════════════════════════════════════════════

async function getORSRoute(start: L.LatLng, end: L.LatLng, apiKey?: string): Promise<RouteResult | null> {
  if (!apiKey) return getOSRMRoute(start, end);
  
  try {
    const url = 'https://api.openrouteservice.org/v2/directions/wheelchair';
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Authorization': apiKey, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        coordinates: [[start.lng, start.lat], [end.lng, end.lat]],
        elevation: true,
        extra_info: ['surface', 'waytype', 'steepness'],
        instructions: true,
      }),
    });
    
    if (!response.ok) throw new Error('ORS API error');
    const data = await response.json();
    return parseORSResponse(data);
  } catch (error) {
    console.warn('ORS unavailable, falling back to OSRM');
    return getOSRMRoute(start, end);
  }
}

function parseORSResponse(data: any): RouteResult {
  const route = data.routes?.[0];
  if (!route) {
    return { 
      segments: [], 
      totalDistance: 0, 
      estimatedTime: 0, 
      warnings: ['No route data available'] 
    };
  }
  
  const coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
  const segments = classifySegments(coords, route.extras);
  
  return {
    segments,
    totalDistance: route.summary.distance,
    estimatedTime: route.summary.duration,
    warnings: extractWarnings(route),
    elevationProfile: route.geometry.coordinates.map((c: number[], i: number) => ({
      distance: (i / coords.length) * route.summary.distance,
      elevation: c[2] || 1300,
    })),
  };
}

function classifySegments(coords: [number, number][], extras?: any): RouteSegment[] {
  if (!extras) return [{ coordinates: coords, accessibility: 'safe' }];
  
  const segments: RouteSegment[] = [];
  const steepness = extras?.steepness?.values || [];
  const chunkSize = Math.max(1, Math.floor(coords.length / 8));
  
  for (let i = 0; i < coords.length; i += chunkSize) {
    const end = Math.min(i + chunkSize + 1, coords.length);
    const chunk = coords.slice(i, end);
    
    let acc: 'safe' | 'caution' | 'hazard' = 'safe';
    
    if (steepness.length > 0) {
      const idx = Math.floor((i / coords.length) * steepness.length);
      const val = steepness[idx]?.[2] || 0;
      if (val > 8) acc = 'hazard';
      else if (val > 4) acc = 'caution';
    }
    
    segments.push({ 
      coordinates: chunk, 
      accessibility: acc,
      surface: getSurfaceType(extras, i / coords.length),
      incline: getIncline(extras, i / coords.length)
    });
  }
  
  return segments;
}

function getSurfaceType(extras: any, ratio: number): string {
  const surfaces = extras?.surface?.values || [];
  const idx = Math.floor(ratio * surfaces.length);
  const surfaceCode = surfaces[idx]?.[2] || 0;
  
  const surfaceMap: Record<number, string> = {
    0: 'Unknown',
    1: 'Asphalt',
    2: 'Concrete',
    3: 'Paved',
    4: 'Unpaved',
    5: 'Gravel',
    6: 'Ground',
  };
  
  return surfaceMap[surfaceCode] || 'Unknown';
}

function getIncline(extras: any, ratio: number): number {
  const steepness = extras?.steepness?.values || [];
  const idx = Math.floor(ratio * steepness.length);
  return steepness[idx]?.[2] || 0;
}

function extractWarnings(route: any): string[] {
  const warnings: string[] = [];
  const extras = route.extras || {};
  
  if (extras.steepness?.summary) {
    extras.steepness.summary.forEach((s: any) => {
      if (s.value > 8) warnings.push(`⚠️ Very steep section (${s.value}% incline)`);
      else if (s.value > 5) warnings.push(`⚠️ Steep section detected (${s.value}% incline)`);
    });
  }
  
  if (extras.surface?.summary) {
    extras.surface.summary.forEach((s: any) => {
      if (s.value >= 4) warnings.push('🛤️ Unpaved surface detected - may be difficult');
    });
  }
  
  return warnings;
}

async function getOSRMRoute(start: L.LatLng, end: L.LatLng): Promise<RouteResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true&annotations=true`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error('OSRM error');
    const data = await response.json();
    return parseOSRMResponse(data);
  } catch (error) {
    console.warn('OSRM unavailable, using enhanced mock route');
    return getEnhancedMockRoute(start, end);
  }
}

function parseOSRMResponse(data: any): RouteResult {
  const route = data.routes?.[0];
  if (!route) {
    return { 
      segments: [], 
      totalDistance: 0, 
      estimatedTime: 0, 
      warnings: ['No route data available'] 
    };
  }
  
  const coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
  const segments = generateEnhancedAccessibilitySegments(coords);
  
  return {
    segments,
    totalDistance: route.distance,
    estimatedTime: route.duration * 1.5, // Adjust for wheelchair speed
    warnings: [
      'Route calculated for pedestrian - verify accessibility',
      'Check local conditions before traveling'
    ],
    elevationProfile: coords.map((_, i) => ({
      distance: (i / coords.length) * route.distance,
      elevation: 1300 + Math.sin(i * 0.3) * 25 + Math.cos(i * 0.2) * 15,
    })),
  };
}

function generateEnhancedAccessibilitySegments(coords: [number, number][]): RouteSegment[] {
  const segments: RouteSegment[] = [];
  const numSegments = Math.max(5, Math.floor(coords.length / 6));
  const chunkSize = Math.ceil(coords.length / numSegments);
  
  const surfaces = ['Asphalt', 'Concrete', 'Paved', 'Gravel', 'Unpaved', 'Cobblestone'];
  const descriptions = [
    'Good paved road, wide sidewalks',
    'Narrow sidewalk section, moderate width',
    'Unpaved stretch - use caution',
    'Gradual incline ahead',
    'Construction zone nearby, may have detours',
    'Well-maintained path',
    'Smooth surface, good accessibility',
    'Rough terrain, proceed carefully'
  ];
  
  for (let i = 0; i < coords.length; i += chunkSize) {
    const end = Math.min(i + chunkSize + 1, coords.length);
    const chunk = coords.slice(i, end);
    if (chunk.length < 2) continue;
    
    // Calculate incline based on position
    const incline = Math.sin(i * 0.2) * 6 + Math.random() * 4;
    
    // Determine accessibility based on incline and random factors
    let acc: 'safe' | 'caution' | 'hazard';
    if (incline < 3 && Math.random() > 0.3) acc = 'safe';
    else if (incline < 6 && Math.random() > 0.2) acc = 'caution';
    else acc = 'hazard';
    
    segments.push({
      coordinates: chunk,
      accessibility: acc,
      surface: surfaces[Math.floor(Math.random() * surfaces.length)],
      incline: incline,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
    });
  }
  
  return segments;
}

function getEnhancedMockRoute(start: L.LatLng, end: L.LatLng): RouteResult {
  const steps = 25;
  const coords: [number, number][] = [];
  
  // Create a more realistic path with some curvature
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Add some sinusoidal variation to make path more realistic
    const offset = Math.sin(t * Math.PI * 4) * 0.002;
    coords.push([
      start.lat + (end.lat - start.lat) * t + offset,
      start.lng + (end.lng - start.lng) * t + Math.cos(t * Math.PI * 3) * 0.001,
    ]);
  }
  
  const segments = generateEnhancedAccessibilitySegments(coords);
  const dist = start.distanceTo(end);
  
  return {
    segments,
    totalDistance: dist,
    estimatedTime: (dist / 1.0) * 1.5, // Slower speed for wheelchair
    warnings: [
      'Using simulated route data - for demonstration only',
      'Actual conditions may vary',
      'Some streets may have accessibility challenges'
    ],
    elevationProfile: coords.map((_, i) => ({
      distance: (i / coords.length) * dist,
      elevation: 1300 + Math.sin(i * 0.4) * 35 + Math.cos(i * 0.3) * 20,
    })),
  };
}

function exportRouteAsGPX(segments: { coordinates: [number, number][] }[]): string {
  const points = segments.flatMap(s => s.coordinates);
  const gpxPoints = points
    .map(([lat, lng]) => `      <trkpt lat="${lat}" lon="${lng}"><ele>1300</ele></trkpt>`)
    .join('\n');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="AccessNav Kathmandu" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Wheelchair Accessible Route</name>
    <desc>Route calculated for wheelchair accessibility in Kathmandu</desc>
    <author>
      <name>AccessNav KTM</name>
    </author>
  </metadata>
  <trk>
    <name>Wheelchair Route</name>
    <type>wheelchair_accessible</type>
    <trkseg>
${gpxPoints}
    </trkseg>
  </trk>
</gpx>`;
}

function generateShareUrl(startLat: number, startLng: number, endLat: number, endLng: number): string {
  return `${window.location.origin}?start=${startLat.toFixed(6)},${startLng.toFixed(6)}&end=${endLat.toFixed(6)},${endLng.toFixed(6)}`;
}

// ═══════════════════════════════════════════════════════════
// MAP ICONS
// ═══════════════════════════════════════════════════════════

const createIcon = (color: string, size = 12, label?: string) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;">${label || ''}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const startIcon = L.divIcon({
  className: 'start-marker',
  html: `<div style="width:24px;height:24px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:bold;">A</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const endIcon = L.divIcon({
  className: 'end-marker',
  html: `<div style="width:24px;height:24px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:bold;">B</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const currentLocationIcon = L.divIcon({
  className: 'current-location-marker',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 2px rgba(59,130,246,0.3);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:50%;background:white;"></div></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// ═══════════════════════════════════════════════════════════
// SIDEBAR COMPONENT
// ═══════════════════════════════════════════════════════════

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchSelect: (result: SearchResult) => void;
  onUseCurrentLocation: () => void;
  savedLocations: SavedLocation[];
  recentSearches: SearchResult[];
  onClearRecent: () => void;
  onDeleteSaved: (id: string) => void;
  onSelectSaved: (location: SavedLocation) => void;
}

function SidebarComponent({
  isOpen,
  onClose,
  onSearchSelect,
  onUseCurrentLocation,
  savedLocations,
  recentSearches,
  onClearRecent,
  onDeleteSaved,
  onSelectSaved,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'saved' | 'recent' | 'settings'>('search');
  const searchTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchPlaces(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 500);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  const handleSelectResult = (result: SearchResult) => {
    onSearchSelect(result);
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute left-4 top-20 bottom-4 w-96 z-[1000] flex flex-col">
      {/* Sidebar Container */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Accessibility className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">Sahayatri KTM</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 px-4">
          {[
            { id: 'search', label: 'Search', icon: Search },
            { id: 'saved', label: 'Saved', icon: BookOpen },
            { id: 'recent', label: 'Recent', icon: Clock },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex-1 py-3 px-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          
          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-3 border border-slate-200 focus-within:border-blue-500 transition-colors">
                  <Search className="w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search for places in Kathmandu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent outline-none text-slate-700 placeholder:text-slate-400 flex-1 text-sm"
                  />
                  {isSearching && (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </div>

              {/* Current Location Button */}
              <button
                onClick={onUseCurrentLocation}
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl py-3 px-4 flex items-center gap-3 transition-colors border border-blue-200"
              >
                <Navigation2 className="w-5 h-5" />
                <span className="text-sm font-medium">Use My Current Location</span>
              </button>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider px-2">
                    Search Results
                  </h3>
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelectResult(result)}
                      className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100"
                    >
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{result.name}</p>
                          <p className="text-xs text-slate-500 truncate">{result.displayName}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Accessibility className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold text-slate-600">
                            {result.accessibilityScore}/10
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length > 0 && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-8 text-slate-500">
                  <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No places found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          )}

          {/* Saved Locations Tab */}
          {activeTab === 'saved' && (
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider px-2">
                Saved Locations
              </h3>
              
              {savedLocations.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No saved locations</p>
                  <p className="text-xs mt-1">Save your frequent places for quick access</p>
                </div>
              ) : (
                savedLocations.map((loc) => (
                  <div key={loc.id} className="group relative">
                    <button
                      onClick={() => onSelectSaved(loc)}
                      className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          loc.type === 'home' ? 'bg-green-100' :
                          loc.type === 'work' ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          {loc.type === 'home' && <Home className="w-4 h-4 text-green-600" />}
                          {loc.type === 'work' && <User className="w-4 h-4 text-blue-600" />}
                          {loc.type === 'favorite' && (
                            <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                          )}
                          {loc.type === 'recent' && <Clock className="w-4 h-4 text-slate-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{loc.name}</p>
                          <p className="text-xs text-slate-500 truncate">{loc.address}</p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => onDeleteSaved(loc.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Recent Searches Tab */}
          {activeTab === 'recent' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Recent Searches
                </h3>
                {recentSearches.length > 0 && (
                  <button
                    onClick={onClearRecent}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {recentSearches.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No recent searches</p>
                  <p className="text-xs mt-1">Your search history will appear here</p>
                </div>
              ) : (
                recentSearches.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectResult(result)}
                    className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100"
                  >
                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{result.name}</p>
                        <p className="text-xs text-slate-500 truncate">{result.displayName}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl p-4">
                <h3 className="font-medium text-slate-700 mb-3">Route Preferences</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-600">Avoid slopes above 6%</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-600">Avoid narrow alleys</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-600">Avoid unpaved roads</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-600">Prefer sidewalks</span>
                  </label>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <h3 className="font-medium text-slate-700 mb-3">Map Settings</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" defaultChecked />
                    <span className="text-sm text-slate-600">Show hazards on map</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" defaultChecked />
                    <span className="text-sm text-slate-600">Show user reports</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-600">Show elevation profile</span>
                  </label>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <h3 className="font-medium text-slate-700 mb-3">Accessibility</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-600">High contrast mode</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-600">Large text</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-600">Voice guidance</span>
                  </label>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <h3 className="font-medium text-slate-700 mb-3">About</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Sahayatri KTM v1.0.0
                </p>
                <p className="text-xs text-slate-500">
                  Wheelchair navigation for Kathmandu Valley
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <Shield className="w-3 h-3" />
                  <span>OpenStreetMap data © OSM contributors</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Wifi className="w-3 h-3" />
            <span>Connected</span>
            <span className="mx-2">•</span>
            <Shield className="w-3 h-3" />
            <span>Privacy First</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAP COMPONENTS
// ═══════════════════════════════════════════════════════════

function MapViewComponent({
  onMapClick,
  route,
  hazards,
  reports,
  startPoint,
  endPoint,
  currentLocation,
  flyTo,
  mapStyle,
  onMapReady,
}: {
  onMapClick: (lat: number, lng: number) => void;
  route: RouteResult | null;
  hazards: HazardPoint[];
  reports: IssueReport[];
  startPoint: { lat: number; lng: number } | null;
  endPoint: { lat: number; lng: number } | null;
  currentLocation: { lat: number; lng: number } | null;
  flyTo: { lat: number; lng: number } | null;
  mapStyle: string;
  onMapReady?: (map: L.Map) => void;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const hazardLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    
    const map = L.map(containerRef.current, { 
      center: [KATHMANDU_CENTER.lat, KATHMANDU_CENTER.lng], 
      zoom: 14, 
      zoomControl: true,
      zoomControlOptions: { position: 'bottomright' }
    });
    
    const layer = TILE_LAYERS[mapStyle] || TILE_LAYERS.dark;
    tileLayerRef.current = L.tileLayer(layer.url, { 
      attribution: layer.attribution, 
      maxZoom: 19 
    }).addTo(map);
    
    markersRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    hazardLayerRef.current = L.layerGroup().addTo(map);
    
    map.on('click', (e: L.LeafletMouseEvent) => onMapClick(e.latlng.lat, e.latlng.lng));
    
    mapRef.current = map;
    
    if (onMapReady) onMapReady(map);
    
    return () => { 
      map.remove(); 
      mapRef.current = null; 
    };
  }, []);

  // Update tile layer when map style changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    const layer = TILE_LAYERS[mapStyle] || TILE_LAYERS.dark;
    tileLayerRef.current.setUrl(layer.url);
  }, [mapStyle]);

  // Update markers
  useEffect(() => {
    if (!markersRef.current) return;
    
    markersRef.current.clearLayers();
    
    if (startPoint) {
      L.marker([startPoint.lat, startPoint.lng], { icon: startIcon })
        .bindPopup('<div class="text-sm font-bold">Start Point</div><div class="text-xs">Click to change</div>')
        .addTo(markersRef.current);
    }
    
    if (endPoint) {
      L.marker([endPoint.lat, endPoint.lng], { icon: endIcon })
        .bindPopup('<div class="text-sm font-bold">Destination</div><div class="text-xs">Your target location</div>')
        .addTo(markersRef.current);
    }

    if (currentLocation) {
      L.marker([currentLocation.lat, currentLocation.lng], { icon: currentLocationIcon })
        .bindPopup('<div class="text-sm font-bold">You are here</div>')
        .addTo(markersRef.current);
    }
  }, [startPoint, endPoint, currentLocation]);

  // Update route
  useEffect(() => {
    if (!routeLayerRef.current) return;
    routeLayerRef.current.clearLayers();
    
    if (!route) return;
    
    route.segments.forEach((seg) => {
      if (seg.coordinates.length < 2) return;
      const color = ROUTE_COLORS[seg.accessibility];
      
      // Main route line
      L.polyline(seg.coordinates, { 
        color, 
        weight: 6, 
        opacity: 0.9, 
        lineCap: 'round', 
        lineJoin: 'round' 
      })
      .bindPopup(`
        <div class="text-xs">
          <b style="color:${color}">${seg.accessibility.toUpperCase()}</b><br/>
          ${seg.surface ? `Surface: ${seg.surface}<br/>` : ''}
          ${seg.incline ? `Incline: ${seg.incline.toFixed(1)}%<br/>` : ''}
          ${seg.description || ''}
        </div>
      `)
      .addTo(routeLayerRef.current!);
      
      // Glow effect
      L.polyline(seg.coordinates, { 
        color, 
        weight: 14, 
        opacity: 0.15, 
        lineCap: 'round', 
        lineJoin: 'round' 
      }).addTo(routeLayerRef.current!);
    });
  }, [route]);

  // Update hazards and reports
  useEffect(() => {
    if (!hazardLayerRef.current) return;
    hazardLayerRef.current.clearLayers();
    
    hazards.forEach((h) => {
      const color = h.type === 'hazard' ? '#ef4444' : '#f59e0b';
      L.marker([h.lat, h.lng], { icon: createIcon(color, 12) })
        .bindPopup(`
          <div class="text-xs">
            <b style="color:${color}">${h.category}</b><br/>
            ${h.description}
          </div>
        `)
        .addTo(hazardLayerRef.current!);
    });
    
    reports.forEach((r) => {
      L.marker([r.lat, r.lng], { icon: createIcon('#f59e0b', 12) })
        .bindPopup(`
          <div class="text-xs">
            <b>User Report</b><br/>
            ${r.type.replace('_', ' ')}<br/>
            ${r.description}<br/>
            <span class="text-gray-500">${new Date(r.timestamp).toLocaleDateString()}</span>
          </div>
        `)
        .addTo(hazardLayerRef.current!);
    });
  }, [hazards, reports]);

  // Fly to location
  useEffect(() => {
    if (!mapRef.current || !flyTo) return;
    mapRef.current.flyTo([flyTo.lat, flyTo.lng], 16, { duration: 1.5 });
  }, [flyTo]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function MapLegendComponent() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="absolute bottom-6 left-4 z-[1000]">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)} 
          className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg p-3 hover:bg-white transition-colors border border-slate-200"
          title="Map Legend"
        >
          <Info className="w-5 h-5 text-slate-600" />
        </button>
      ) : (
        <div className="bg-white rounded-xl shadow-2xl p-5 w-64 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Map Legend</h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Route colors */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Route Colors</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-1 rounded-full bg-green-500" />
                  <span className="text-sm text-slate-600">Wheelchair Safe</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-1 rounded-full bg-orange-500" />
                  <span className="text-sm text-slate-600">Caution / Narrow</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-1 rounded-full bg-red-500" />
                  <span className="text-sm text-slate-600">Hazardous / Avoid</span>
                </div>
              </div>
            </div>
            
            {/* Points */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Points of Interest</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm" />
                  <span className="text-sm text-slate-600">Hazard Point</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow-sm" />
                  <span className="text-sm text-slate-600">Caution Point</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                  <span className="text-sm text-slate-600">User Report</span>
                </div>
              </div>
            </div>
            
            {/* Markers */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Markers</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500 border-3 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-white">A</div>
                  <span className="text-sm text-slate-600">Start Point</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500 border-3 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-white">B</div>
                  <span className="text-sm text-slate-600">Destination</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500 border-3 border-white shadow-sm flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <span className="text-sm text-slate-600">Your Location</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MapStyleSwitcherComponent({ current, onChange }: { current: string; onChange: (s: string) => void }) {
  return (
    <div className="absolute top-20 right-4 z-[1000] bg-white/90 backdrop-blur-md rounded-xl shadow-lg p-1.5 flex flex-col gap-1 border border-slate-200">
      {MAP_STYLES.map(({ id, label, icon: Icon }) => (
        <button 
          key={id} 
          onClick={() => onChange(id)} 
          className={`p-2.5 rounded-lg transition-colors flex items-center justify-center ${
            current === id 
              ? 'bg-blue-600 text-white' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title={label}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}

function ReportIssueComponent({ lat, lng, onClose, onSaved }: { lat: number; lng: number; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<typeof ISSUE_TYPES[number]['value']>('blocked_sidewalk');
  const [description, setDescription] = useState('');
  
  const handleSubmit = () => { 
    saveReport({ lat, lng, type, description }); 
    onSaved(); 
    onClose(); 
  };
  
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-2xl shadow-2xl p-6 w-96 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-slate-800">Report Issue</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
      
      <p className="text-xs text-slate-500 mb-4">
        Location: {lat.toFixed(5)}, {lng.toFixed(5)}
      </p>
      
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {ISSUE_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                type === t.value 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <t.icon className="w-3 h-3" />
              {t.label}
            </button>
          ))}
        </div>
        
        <textarea 
          placeholder="Describe the issue in detail..." 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none resize-none h-24 border border-slate-200 focus:border-blue-500 transition-colors"
        />
        
        <div className="flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-sm font-medium transition-colors"
            disabled={!description.trim()}
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ROUTE PANEL COMPONENT
// ═══════════════════════════════════════════════════════════

function RoutePanelComponent({
  route,
  startLabel,
  endLabel,
  onClose,
  startCoords,
  endCoords,
}: {
  route: RouteResult | null;
  startLabel?: string;
  endLabel?: string;
  onClose: () => void;
  startCoords?: { lat: number; lng: number };
  endCoords?: { lat: number; lng: number };
}) {
  const [showElevation, setShowElevation] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  if (!route) return null;

  const distKm = (route.totalDistance / 1000).toFixed(1);
  const timeMin = Math.ceil(route.estimatedTime / 60);
  const timeHours = timeMin > 60 ? `${Math.floor(timeMin / 60)}h ${timeMin % 60}m` : `${timeMin} min`;

  // Calculate percentages
  const safeCount = route.segments.filter(s => s.accessibility === 'safe').length;
  const cautionCount = route.segments.filter(s => s.accessibility === 'caution').length;
  const hazardCount = route.segments.filter(s => s.accessibility === 'hazard').length;
  const total = route.segments.length || 1;
  
  const safePercent = Math.round((safeCount / total) * 100);
  const cautionPercent = Math.round((cautionCount / total) * 100);
  const hazardPercent = Math.round((hazardCount / total) * 100);

  const handleExportGPX = () => {
    const gpx = exportRouteAsGPX(route.segments);
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = 'wheelchair-route.gpx'; 
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    if (startCoords && endCoords) {
      const url = generateShareUrl(startCoords.lat, startCoords.lng, endCoords.lat, endCoords.lng);
      navigator.clipboard.writeText(url);
      alert('Route link copied to clipboard!');
    }
  };

  return (
    <div className="absolute right-4 top-20 bottom-4 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[1000] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Accessible Route</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Destination */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <Flag className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Destination</p>
              <p className="font-semibold text-slate-800">{endLabel || 'Selected location'}</p>
              {startLabel && (
                <>
                  <p className="text-sm text-slate-500 mt-2">From</p>
                  <p className="text-sm text-slate-600">{startLabel}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Distance & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Ruler className="w-4 h-4" />
              <span className="text-xs">Distance</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{distKm} <span className="text-sm font-normal text-slate-500">km</span></p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Est. Time</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{timeHours}</p>
          </div>
        </div>

        {/* Accessibility Stats */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Route Accessibility</p>
          
          {/* Percentage bars */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-green-600 font-medium">Safe</span>
                <span className="text-slate-600">{safePercent}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${safePercent}%` }} />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-orange-500 font-medium">Caution</span>
                <span className="text-slate-600">{cautionPercent}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${cautionPercent}%` }} />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-red-600 font-medium">Hazard</span>
                <span className="text-slate-600">{hazardPercent}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${hazardPercent}%` }} />
              </div>
            </div>
          </div>

          {/* Summary numbers */}
          <div className="flex justify-between text-sm pt-2">
            <div className="text-center">
              <span className="block text-2xl font-bold text-green-600">{safePercent}%</span>
              <span className="text-xs text-slate-500">Safe</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-bold text-orange-500">{cautionPercent}%</span>
              <span className="text-xs text-slate-500">Caution</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-bold text-red-600">{hazardPercent}%</span>
              <span className="text-xs text-slate-500">Hazard</span>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {route.warnings.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Warnings</p>
            {route.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 bg-red-50 rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-700">{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Navigation Options */}
        <div className="space-y-3">
          {/* Elevation Profile */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button 
              onClick={() => setShowElevation(!showElevation)}
              className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="font-medium text-slate-700">Elevation Profile</span>
              {showElevation ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            
            {showElevation && route.elevationProfile && route.elevationProfile.length > 0 && (
              <div className="p-4 bg-white">
                <div className="h-20 flex items-end gap-0.5">
                  {route.elevationProfile.map((p, i) => {
                    const min = Math.min(...route.elevationProfile!.map(x => x.elevation));
                    const max = Math.max(...route.elevationProfile!.map(x => x.elevation));
                    const range = max - min || 1;
                    const height = ((p.elevation - min) / range) * 100;
                    const slope = i > 0 ? Math.abs(p.elevation - route.elevationProfile![i - 1].elevation) / 
                      ((p.distance - route.elevationProfile![i - 1].distance) || 1) * 100 : 0;
                    const color = slope > 8 ? 'bg-red-500' : slope > 4 ? 'bg-orange-500' : 'bg-green-500';
                    
                    return (
                      <div 
                        key={i} 
                        className={`flex-1 ${color} rounded-t-sm transition-all min-h-[2px]`} 
                        style={{ height: `${Math.max(height, 5)}%` }}
                        title={`${p.elevation.toFixed(0)}m`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>0 km</span>
                  <span>{(route.totalDistance / 1000).toFixed(1)} km</span>
                </div>
              </div>
            )}
          </div>

          {/* Route Details */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="font-medium text-slate-700">Route Segments</span>
              {showDetails ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            
            {showDetails && (
              <div className="p-4 bg-white space-y-3 max-h-60 overflow-y-auto">
                {route.segments.map((seg, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm border-b border-slate-100 pb-2 last:border-0">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${
                      seg.accessibility === 'safe' ? 'bg-green-500' :
                      seg.accessibility === 'caution' ? 'bg-orange-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium text-slate-700">
                        Segment {idx + 1} - {seg.accessibility.toUpperCase()}
                      </p>
                      {seg.surface && <p className="text-xs text-slate-500">Surface: {seg.surface}</p>}
                      {seg.incline && <p className="text-xs text-slate-500">Incline: {seg.incline.toFixed(1)}%</p>}
                      {seg.description && <p className="text-xs text-slate-600 mt-1">{seg.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button 
            onClick={handleExportGPX}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3 text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-sm font-medium transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>

        {/* Report Issue Button */}
        <button className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl py-3 text-sm font-medium transition-colors border border-red-200">
          <AlertTriangle className="w-4 h-4" />
          Report Issue on This Route
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PERMISSION MODAL COMPONENT
// ═══════════════════════════════════════════════════════════

function LocationPermissionModal({ 
  onAllow, 
  onDeny 
}: { 
  onAllow: () => void; 
  onDeny: () => void;
}) {
  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Navigation2 className="w-8 h-8 text-blue-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">
          Enable Location Access
        </h2>
        
        <p className="text-slate-600 text-center mb-6">
          Sahayatri KTM needs your location to provide accurate wheelchair-accessible routes and find nearby places in Kathmandu.
        </p>
        
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-2">We use your location to:</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Show your current position on the map
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Find nearby accessible places
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Calculate routes from your location
            </li>
            <li className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              Your privacy is protected - location data stays on your device
            </li>
          </ul>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={onAllow}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-medium transition-colors"
          >
            Allow Location Access
          </button>
          <button
            onClick={onDeny}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-4 font-medium transition-colors"
          >
            Not Now
          </button>
        </div>
        
        <p className="text-xs text-slate-400 text-center mt-4">
          You can change this anytime in your browser settings
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════

const Index = () => {
  const [startPoint, setStartPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [startLabel, setStartLabel] = useState('');
  const [endLabel, setEndLabel] = useState('');
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [hazards, setHazards] = useState<HazardPoint[]>([]);
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const [mapStyle, setMapStyle] = useState('dark');
  const [isRouting, setIsRouting] = useState(false);
  const [reportMode, setReportMode] = useState<{ lat: number; lng: number } | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [clickMode] = useState<'start' | 'end'>('end'); // Always set destination on click

  // Load saved data
  useEffect(() => { 
    const loadInitialData = async () => {
      try {
        const hazardsData = await fetchHazards();
        setHazards(hazardsData);
      } catch (error) {
        console.error('Failed to fetch hazards:', error);
        // Fallback to mock data
        const mockHazards = getMockHazards(KATHMANDU_CENTER.lat, KATHMANDU_CENTER.lng);
        setHazards(mockHazards);
      }
      
      setReports(getReports());
      setSavedLocations(getSavedLocations());
      
      // Load recent searches from session storage
      const recent = sessionStorage.getItem('recent-searches');
      if (recent) {
        try {
          setRecentSearches(JSON.parse(recent));
        } catch (e) {
          console.error('Failed to parse recent searches:', e);
        }
      }
    };
    
    loadInitialData();
  }, []);

  // Calculate route when both points are set
  useEffect(() => { 
    if (startPoint && endPoint) {
      calculateRoute();
    }
  }, [startPoint, endPoint]);

  // Handle current location
  const handleAllowLocation = async () => {
    try {
      const position = await getCurrentPosition();
      setCurrentLocation(position);
      setStartPoint(position);
      
      // Reverse geocode for location name
      const address = await reverseGeocode(position.lat, position.lng);
      setStartLabel(address);
      
      // Fly to current location
      setFlyTo(position);
      
      setShowPermissionModal(false);
      setLocationError(null);
    } catch (error) {
      console.error('Location error:', error);
      setLocationError('Could not get your location. Please check permissions.');
      setShowPermissionModal(false);
    }
  };

  const handleDenyLocation = () => {
    setShowPermissionModal(false);
    // Set default start point to Kathmandu center
    setStartPoint(KATHMANDU_CENTER);
    setStartLabel('Kathmandu Center');
  };

  // Route calculation
  const calculateRoute = async () => {
    if (!startPoint || !endPoint) return;
    
    setIsRouting(true);
    
    const start = L.latLng(startPoint.lat, startPoint.lng);
    const end = L.latLng(endPoint.lat, endPoint.lng);
    
    let result = await getORSRoute(start, end);
    if (!result) result = await getOSRMRoute(start, end);
    
    setRoute(result);
    setIsRouting(false);
  };

  // Handle map click
  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (reportMode) return;
    
    // Always set as destination when clicking on map
    setEndPoint({ lat, lng });
    setEndLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    
    // If no start point, use current location or Kathmandu center
    if (!startPoint) {
      if (currentLocation) {
        setStartPoint(currentLocation);
        setStartLabel('Your Location');
      } else {
        setStartPoint(KATHMANDU_CENTER);
        setStartLabel('Kathmandu Center');
      }
    }
    
    // Fly to the clicked point
    setFlyTo({ lat, lng });
  }, [reportMode, startPoint, currentLocation]);

  // Handle place selection
  const handleSelectPlace = useCallback(async (result: SearchResult) => {
    setEndPoint({ lat: result.lat, lng: result.lng });
    setEndLabel(result.name);
    setFlyTo({ lat: result.lat, lng: result.lng });
    
    // Add to recent searches
    const updatedRecent = [result, ...recentSearches.filter(r => r.id !== result.id)].slice(0, 10);
    setRecentSearches(updatedRecent);
    sessionStorage.setItem('recent-searches', JSON.stringify(updatedRecent));
    
    if (!startPoint) {
      if (currentLocation) {
        setStartPoint(currentLocation);
        setStartLabel('Your Location');
      } else {
        setStartPoint(KATHMANDU_CENTER);
        setStartLabel('Kathmandu Center');
      }
    }
    
    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [startPoint, currentLocation, recentSearches]);

  // Handle use current location
  const handleUseCurrentLocation = useCallback(async () => {
    if (!currentLocation) {
      try {
        const position = await getCurrentPosition();
        setCurrentLocation(position);
        setStartPoint(position);
        const address = await reverseGeocode(position.lat, position.lng);
        setStartLabel(address);
        setFlyTo(position);
      } catch (error) {
        setLocationError('Could not get your location');
      }
    } else {
      setStartPoint(currentLocation);
      setFlyTo(currentLocation);
    }
  }, [currentLocation]);

  // Handle saved location select
  const handleSelectSaved = useCallback((location: SavedLocation) => {
    setEndPoint({ lat: location.lat, lng: location.lng });
    setEndLabel(location.name);
    setFlyTo({ lat: location.lat, lng: location.lng });
    
    if (!startPoint) {
      if (currentLocation) {
        setStartPoint(currentLocation);
        setStartLabel('Your Location');
      } else {
        setStartPoint(KATHMANDU_CENTER);
        setStartLabel('Kathmandu Center');
      }
    }
  }, [startPoint, currentLocation]);

  // Handle close route
  const handleCloseRoute = () => { 
    setRoute(null); 
    setEndPoint(null); 
    setEndLabel(''); 
  };

  // Handle clear recent searches
  const handleClearRecent = () => {
    setRecentSearches([]);
    sessionStorage.removeItem('recent-searches');
  };

  // Handle delete saved location
  const handleDeleteSaved = (id: string) => {
    deleteLocation(id);
    setSavedLocations(getSavedLocations());
  };

  // Helper function for score colors
  const getScoreColor = (score: number): string => {
    if (score >= 7) return '#10b981';
    if (score >= 4) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900">
      {/* Map */}
      <MapViewComponent 
        onMapClick={handleMapClick} 
        route={route} 
        hazards={hazards} 
        reports={reports} 
        startPoint={startPoint} 
        endPoint={endPoint}
        currentLocation={currentLocation}
        flyTo={flyTo} 
        mapStyle={mapStyle} 
      />

      {/* Top Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-start gap-3 pointer-events-none">
        {/* Menu Button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="pointer-events-auto bg-white/90 backdrop-blur-md rounded-xl shadow-lg p-3 hover:bg-white transition-colors border border-slate-200"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>

        {/* Location Indicator */}
        {currentLocation && (
          <div className="pointer-events-auto bg-white/90 backdrop-blur-md rounded-xl shadow-lg px-4 py-2 flex items-center gap-2 border border-slate-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-slate-600">Location active</span>
          </div>
        )}

        {/* Click Mode Indicator */}
        <div className="pointer-events-auto bg-white/90 backdrop-blur-md rounded-xl shadow-lg px-5 py-3 border border-slate-200 ml-auto">
          <span className="text-sm text-slate-600 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" />
            Click map to set destination
          </span>
        </div>
      </div>

      {/* Sidebar */}
      <SidebarComponent
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSearchSelect={handleSelectPlace}
        onUseCurrentLocation={handleUseCurrentLocation}
        savedLocations={savedLocations}
        recentSearches={recentSearches}
        onClearRecent={handleClearRecent}
        onDeleteSaved={handleDeleteSaved}
        onSelectSaved={handleSelectSaved}
      />

      {/* Route Panel */}
      {route && (
        <RoutePanelComponent 
          route={route} 
          startLabel={startLabel} 
          endLabel={endLabel} 
          onClose={handleCloseRoute} 
          startCoords={startPoint || undefined} 
          endCoords={endPoint || undefined} 
        />
      )}

      {/* Map Style Switcher */}
      <MapStyleSwitcherComponent current={mapStyle} onChange={setMapStyle} />

      {/* Map Legend */}
      <MapLegendComponent />

      {/* Report Issue Button */}
      <button 
        onClick={() => { 
          const center = currentLocation || startPoint || KATHMANDU_CENTER; 
          setReportMode(center); 
        }} 
        className="absolute bottom-6 right-4 z-[1000] bg-white/90 backdrop-blur-md rounded-xl shadow-lg px-5 py-3 hover:bg-white transition-colors flex items-center gap-2 border border-slate-200"
      >
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        <span className="text-sm text-slate-700">Report Issue</span>
      </button>

      {/* Report Issue Modal */}
      {reportMode && (
        <ReportIssueComponent 
          lat={reportMode.lat} 
          lng={reportMode.lng} 
          onClose={() => setReportMode(null)} 
          onSaved={() => setReports(getReports())} 
        />
      )}

      {/* Location Permission Modal */}
      {showPermissionModal && (
        <LocationPermissionModal
          onAllow={handleAllowLocation}
          onDeny={handleDenyLocation}
        />
      )}

      {/* Loading Indicator */}
      {isRouting && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1100] bg-white rounded-xl shadow-2xl px-6 py-4 flex items-center gap-3 border border-slate-200">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-700">Finding accessible route...</span>
        </div>
      )}

      {/* Location Error */}
      {locationError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1100] bg-red-50 rounded-xl shadow-lg px-6 py-3 flex items-center gap-3 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-700">{locationError}</span>
          <button 
            onClick={() => setLocationError(null)}
            className="p-1 hover:bg-red-100 rounded-lg"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Index;