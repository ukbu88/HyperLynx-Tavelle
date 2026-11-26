export type Env = {
  DB: D1Database;
  FILES: R2Bucket;
  ASSETS?: Fetcher;
  ENVIRONMENT?: string;
};

export type AppVariables = {
  requestId: string;
};
