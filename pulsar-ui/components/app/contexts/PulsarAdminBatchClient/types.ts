// Serialized tree path
export type TreePathStr = string;

export type BatchRequest = {
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
}

