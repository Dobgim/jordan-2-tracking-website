import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async loader and exposes { data, error, loading, reload }.
 * `deps` works like useEffect's dependency list.
 */
export function useResource(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await loaderRef.current();
      setState({ data, error: '', loading: false });
    } catch (err) {
      setState({ data: null, error: err.message, loading: false });
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload };
}
