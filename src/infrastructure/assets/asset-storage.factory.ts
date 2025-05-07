import { AssetStorageInterface } from './interfaces/asset-storage.interface';
import { AssetResolver } from './interfaces/asset-resolver.interface';
import { LocalAssetStorageAdapter } from './local/local-storage.adapter';

export type AssetProvider = AssetStorageInterface & AssetResolver;

export function createAssetProvider(): AssetProvider {
  const provider = process.env['ASSETS_PROVIDER'] || 'local';
  switch (provider) {
    case 'local':
    default:
      return new LocalAssetStorageAdapter();
  }
}
