import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

/** Refuse anything that is not an image, plus anything above 5 MB. */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Talks to Cloudinary. Reads `CLOUDINARY_URL` from the environment on the
 * first `config()` call, so no key is ever hardcoded.
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    // `true` forces a reset + re-read of process.env.CLOUDINARY_URL. Needed
    // because the cloudinary package snapshots the env on its first config()
    // call at import time — before ConfigModule has loaded .env. A plain
    // config() here would keep that empty snapshot. The URL itself is
    // validated at boot by the REQUIRED_ENV_VARS check in app.module.ts.
    cloudinary.config(true);

    // Fail fast: a missing/unparsable key here would otherwise surface as a
    // 500 on the first image upload (Must supply api_key).
    const config = cloudinary.config();
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      throw new Error(
        'CLOUDINARY_URL is invalid — expected cloudinary://API_KEY:API_SECRET@CLOUD_NAME',
      );
    }
  }

  isImageFile(file: { mimetype: string; size: number }): boolean {
    return (
      ALLOWED_MIME_TYPES.includes(file.mimetype) && file.size <= MAX_IMAGE_BYTES
    );
  }

  /**
   * Sends the raw multer buffer to Cloudinary and returns the public URL.
   * The upload is named after the user id, so a new avatar replaces the old
   * one instead of piling up files.
   */
  async uploadAvatar(userId: string, image: Express.Multer.File): Promise<string> {
    if (!this.isImageFile(image)) {
      throw new BadRequestException(
        'image must be jpeg, png, webp or gif and at most 5 MB',
      );
    }

    const result = await new Promise<{
      secure_url?: string;
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'todo-api/avatars',
          public_id: userId,
          // Replace the previous avatar rather than keeping both.
          overwrite: true,
          invalidate: true,
          resource_type: 'image',
        },
        (error, uploadResult) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(uploadResult ?? {});
        },
      );

      stream.end(image.buffer);
    });

    if (!result.secure_url) {
      this.logger.error(`Cloudinary returned no URL for user ${userId}`);
      throw new BadRequestException('could not upload the image');
    }

    return result.secure_url;
  }
}
