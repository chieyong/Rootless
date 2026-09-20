import { useCallback, useState } from 'react';
import { load, save } from './local.js';

/** useState that survives a reload. */
export default function useStored(key, initial) {
  const [value, setValue] = useState(() => load(key, initial));
  const update = useCallback((next) => {
    setValue((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      save(key, resolved);
      return resolved;
    });
  }, [key]);
  return [value, update];
}
