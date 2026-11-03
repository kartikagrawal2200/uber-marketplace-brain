import React from 'react';
import { CAP } from './constants.js';
import { CityMap } from './components/CityMap.jsx';
import { Navbar } from './components/Navbar.jsx';
import { ZoneDetailCard } from './components/ZoneDetailCard.jsx';
import { DemoGuideModal } from './components/DemoGuideModal.jsx';
import { SyntheticBadge } from './components/SyntheticBadge.jsx';
import { MapMock } from './components/MapMock.jsx';

export const cx = (...a) => a.filter(Boolean).join(' ');

/* Re-export all icons */
export * from './icons.jsx';

/* Re-export components */
export { 
  CityMap, 
  CityMap as ZoneMap, 
  CityMap as Map, 
  Navbar, 
  ZoneDetailCard, 
  DemoGuideModal,
  SyntheticBadge,
  MapMock
};

export function Waiting({ conn }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#F6F6FB]">
      <div className="w-10 h-10 rounded-full border-4 border-black border-t-transparent animate-spin mb-3" />
      <h3 className="text-base font-bold text-gray-900">Loading Uber...</h3>
      <p className="text-xs text-gray-500 mt-1">Connecting to state engine</p>
    </div>
  );
}

export function Spinner() {
  return <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-label="Loading" />;
}
