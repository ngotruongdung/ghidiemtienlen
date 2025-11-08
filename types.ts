export interface Round {
  id: string;
  scores: (number | string)[];
}

export const DEFAULT_PLAYERS = ['Người 1', 'Người 2', 'Người 3', 'Người 4'];
export const DEFAULT_BETTING_LEVELS = [10, 20];
