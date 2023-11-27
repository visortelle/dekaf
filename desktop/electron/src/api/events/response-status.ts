export type StatusCode = "OK" | "Error"

export type Status = {
  code: StatusCode,
  message?: string
};
