import fetch, {
  Headers,
  Request,
  Response,
} from "node-fetch";
import { AbortController } from "node-abort-controller";

export function polyfill() {
  // Fix AbortController is not defined error
  (globalThis as any).AbortController = AbortController;

  if (!(globalThis as any).fetch) {
    (globalThis as any).fetch = fetch;
    (globalThis as any).Headers = Headers;
    (globalThis as any).Request = Request;
    (globalThis as any).Response = Response;
  }
}
