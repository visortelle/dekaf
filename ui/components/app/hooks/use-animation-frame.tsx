// Source: https://github.com/franciscop/use-animation-frame/blob/master/index.js

// Based off a tweet and codesandbox:
// https://mobile.twitter.com/hieuhlc/status/1164369876825169920
import { useLayoutEffect, useRef } from "react";

// Reusable component that also takes dependencies
type Callback = (perf: Performance) => void
type Performance = {
  time: number,
  delta: number,
}
export const useAnimationFrame = (cb: Callback) => {
  const cbRef = useRef<Callback>(cb);
  const frame = useRef<number>();
  const init = useRef(performance.now());
  const last = useRef(performance.now());

  cbRef.current = cb;

  const animate = (now: number) => {
    // In seconds ~> you can do ms or anything in userland
    cbRef.current({
      time: (now - init.current),
      delta: (now - last.current),
    });
    last.current = now;
    frame.current = requestAnimationFrame(animate);
  };

  useLayoutEffect(() => {
    if (typeof performance === "undefined" || typeof window === "undefined") {
      return;
    }

    frame.current = requestAnimationFrame(animate);

    return () => {
      frame.current && cancelAnimationFrame(frame.current)
    };
  }, []);
};
