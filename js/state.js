export const App = {
  db: null,
  plants: [],
  currentPage: 'dashboard',
  calendarDate: new Date(),
  sortMode: 'date-desc',
  terrain: {
    width:           10,
    height:          8,
    cells:           [],
    activeTool:      'soil',
    selectedCell:    null,
    viewMode:        'plan',
    timelineDate:    new Date(),
    _pendingPlantId: null,
  },
};
