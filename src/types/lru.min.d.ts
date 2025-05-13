declare module 'lru.min' {
  type LRUType = {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
    peek: (key: string) => unknown;
    has: (key: string) => boolean;
    delete: (key: string) => boolean;
    keys: () => IterableIterator<string>;
    values: () => IterableIterator<unknown>;
    entries: () => IterableIterator<[string, unknown]>;
    forEach: (callback: (value: unknown, key: string) => void) => void;
    evict: (number: number) => void;
    clear: () => void;
    resize: (newMax: number) => void;
    readonly max: number;
    readonly size: number;
    readonly available: number;
  };

  type LRUConstructorOptions = {
    max: number;
    onEviction?: (key: string, value: unknown) => void;
  };

  // The actual export is 'createLRU', not 'LRU'
  export const createLRU: (options: LRUConstructorOptions) => LRUType;
}
