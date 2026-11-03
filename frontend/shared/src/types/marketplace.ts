export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'heavy_rain' | 'storm';

export type ZoneType = 'residential' | 'commercial' | 'transit_hub' | 'entertainment' | 'industrial';

export interface ZoneState {
  zone_id: number;
  name: string;
  zone_type: ZoneType;
  pending_requests: number;
  idle_drivers: number;
  demand_forecast: number | null;
  congestion: number;
  active_event: string | null;
}

export interface MarketplaceState {
  tick: number;
  simulated_hour: number;
  weather: WeatherCondition;
  zones: ZoneState[];
  pending_requests: number;
  total_requests: number;
  completed_requests: number;
  fulfilment_rate: number;
  active_drivers: number;
  idle_drivers: number;
  events: string[];
}

export interface PositioningHint {
  driver_id: string;
  action: 'go' | 'stay';
  current_zone_id: number;
  target_zone_id: number | null;
  reason: string;
  confidence: number;
  estimated_earnings_boost: number;
}

export interface Metrics {
  fulfilment_rate: number;
  baseline_fulfilment_rate: number;
  delta_fr_pp: number;
  total_requests: number;
  completed_requests: number;
}
