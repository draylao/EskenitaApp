import { useEffect, useState } from "react";

/**
 * Returns `value` only after it has stopped changing for `delayMs`.
 * Used to throttle expensive work (API calls, geocoding) behind fast
 * user input like typing in a search bar.
 */
const useDebounce = (value, delayMs = 400) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};

export default useDebounce;
