import React from 'react';

export function SyntheticBadge() {
  return (
    <div className="fixed top-2 right-2 z-50 pointer-events-none">
      <span className="text-[10px] font-bold text-gray-500 bg-gray-200/90 backdrop-blur-sm px-2 py-0.5 rounded shadow-sm border border-gray-300">
        SYNTHETIC DATA
      </span>
    </div>
  );
}

