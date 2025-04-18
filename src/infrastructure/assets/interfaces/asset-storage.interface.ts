/**
 * Asset Storage Interface for Open Badges Modular Server
 * Defines the contract for asset storage backends (e.g. local, S3, Cloudinary).
 */

export interface AssetStorageInterface {
  /**
   * Store a file and return its public URL or reference key.
   * @param fileBuffer Buffer containing file data.
   * @param filename Desired filename (may be sanitized/modified by backend).
   * @param mimetype MIME type of the file.
   * @returns The public URL or reference key for the stored asset.
   */
  store(fileBuffer: Buffer, filename: string, mimetype: string): Promise<string>;

  /**
   * Optionally delete a file by key or URL.
   */
  delete?(keyOrUrl: string): Promise<boolean>;
}
