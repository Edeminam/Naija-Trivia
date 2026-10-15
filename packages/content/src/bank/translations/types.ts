export interface Translation {
  text: string;
  /** Same order as the English options: correct answer first */
  options: [string, string, string, string];
  fact: string;
}
