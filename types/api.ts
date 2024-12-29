export interface ApiResponse<T> {
  results: T[];
  nextPage: number | null;
}
