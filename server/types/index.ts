export interface ApiError {
  code: string;
  userMessageKey: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}
export interface ApiResponse {
  status: number;
  body: Record<string, unknown> | ApiError;
}
