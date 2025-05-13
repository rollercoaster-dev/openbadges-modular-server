declare module 'lru.min' {
  type LRUType = {
    get: (key: string) => unknown;
    set: (key: string, value: unknown, maxAge?: number) => boolean;
    has: (key: string) => boolean;
    delete: (key: string) => boolean;
    remove?: (key: string) => void; // Optional, as some LRU implementations might have it
    clear: () => boolean;
    keys: () => string[];
    size: number;
  };

  type LRUConstructorOptions = {
    max: number;
    updateAgeOnGet: boolean;
  };

  type LRUConstructor = (options: LRUConstructorOptions) => LRUType;

  // Assume 'LRU' is the named export based on common conventions and to test against the CI error
  export const LRU: LRUConstructor;

  // If 'LRU' doesn't work, 'lru' would be the next common alternative:
  // export const lru: LRUConstructor;

  // If it were a default export (which CI suggests it's not for the .mjs file):
  // const lruDefault: LRUConstructor;
  // export default lruDefault;
}
