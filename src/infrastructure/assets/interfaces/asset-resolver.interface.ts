/**
 * Asset Resolver Interface
 * Used for resolving asset URLs or paths from keys or references.
 */

export interface AssetResolver {
  /**
   * Resolve a public URL for a given asset key or reference.
   * @param keyOrReference The key or reference returned by storage backend.
   * @returns The public URL for accessing the asset.
   */
  resolve(keyOrReference: string): string;
}
