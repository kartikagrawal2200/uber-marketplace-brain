// Constants shared by the simulator (node) and the three frontend apps (browser).
export const COLS = 4;
export const ROWS = 3;
export const CAP = 1.4;           // requests/min one driver can serve
export const BASE_FARE = 120;     // ₹ at 1.0x
export const SIM_SEC_PER_MIN = 3; // 1 simulated minute of travel = 3 real seconds

export const ZONE_NAMES = [
  'Old Town', 'Riverside', 'Tech Park', 'Airport Road',
  'University', 'Central Station', 'Stadium', 'Harbour',
  'Market Street', 'Business District', 'Hospital', 'Lakeside',
];

export const ZONE_DETAILS = [
  { id: 1, name: 'Old Town', icon: '🏛️', type: 'Historic / Tourism', desc: 'Narrow streets, tourist monuments, museums' },
  { id: 2, name: 'Riverside', icon: '🌊', type: 'Scenic Promenade', desc: 'Cafes, walking trails, waterfront dining' },
  { id: 3, name: 'Tech Park', icon: '💻', type: 'Corporate Campus', desc: 'IT towers, startups, high morning & evening rush' },
  { id: 4, name: 'Airport Road', icon: '✈️', type: 'Transit Corridor', desc: 'Airport transit, luggage trips, steady day-long demand' },
  { id: 5, name: 'University', icon: '🎓', type: 'College Campus', desc: 'Student hostels, libraries, budget ride requests' },
  { id: 6, name: 'Central Station', icon: '🚆', type: 'Main Transit Hub', desc: 'City railway terminal, high passenger arrivals' },
  { id: 7, name: 'Stadium', icon: '🏟️', type: 'Sports & Concerts', desc: 'Massive event venue, extreme surge when events end' },
  { id: 8, name: 'Harbour', icon: '⚓', type: 'Port & Industrial', desc: 'Logistics center, dock workers, late night shifts' },
  { id: 9, name: 'Market Street', icon: '🛍️', type: 'Shopping & Retail', desc: 'Bustling bazaars, shopping malls, family shoppers' },
  { id: 10, name: 'Business District', icon: '🏢', type: 'Financial Center', desc: 'High-rise banks, offices, premium corporate commuters' },
  { id: 11, name: 'Hospital', icon: '🏥', type: 'Medical Center', desc: '24/7 emergency hospital zone, urgent patient rides' },
  { id: 12, name: 'Lakeside', icon: '🏞️', type: 'Residential Suburban', desc: 'Gated residential communities, quiet daytime demand' },
];

// Demand relative to what the drivers in a zone can serve. 1.0 is balanced; above 1.1 a zone starts to surge.
export const pressureOf = (demand, supply) => demand / (supply * CAP + 0.5);
export const surgeOf = (p) => Math.round(Math.min(3, Math.max(1, 1 + Math.max(0, p - 1.1) * 0.8)) * 10) / 10;
export const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
