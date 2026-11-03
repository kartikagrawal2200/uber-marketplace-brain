// Constants shared by the simulator (node) and the three sites (browser). Keep this file free of JSX/DOM.
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

// Demand relative to what the drivers in a zone can serve. 1.0 is balanced; above 1.1 a zone starts to surge.
export const pressureOf = (demand, supply) => demand / (supply * CAP + 0.5);
export const surgeOf = (p) => Math.round(Math.min(3, Math.max(1, 1 + Math.max(0, p - 1.1) * 0.8)) * 10) / 10;
export const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
