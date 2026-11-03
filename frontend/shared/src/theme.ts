export const theme = {
  colors: {
    primary:   '#000000',
    secondary: '#276EF1',
    accent:    '#F6C90E',

    success:   '#05A357',
    warning:   '#FFC043',
    danger:    '#E11900',
    info:      '#1E54B7',

    zoneColors: {
      residential:   '#4CAF50',
      commercial:    '#2196F3',
      transit_hub:   '#9C27B0',
      entertainment: '#FF5722',
      industrial:    '#795548',
    },

    weatherColors: {
      clear:      '#FFF9C4',
      cloudy:     '#CFD8DC',
      rain:       '#90CAF9',
      heavy_rain: '#1565C0',
      storm:      '#37474F',
    },
  },

  congestionGradient: ['#00C853', '#FFEB3B', '#FF6D00', '#B71C1C'],
} as const;
