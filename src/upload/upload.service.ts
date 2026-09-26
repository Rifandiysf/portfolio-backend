import { Inject, Injectable } from '@nestjs/common';
import { UploadApiResponse, v2 } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class UploadService {
  constructor(@Inject('CLOUDINARY') private cloudinary: typeof v2) {}

  uploadImage(file: Express.Multer.File): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = this.cloudinary.uploader.upload_stream(
        { folder: 'portfolio' },
        (error, result) =>
          error
            ? reject(new Error(error.message, { cause: error }))
            : resolve(result!),
      );
      streamifier.createReadStream(file.buffer).pipe(stream);
    });
  }
}
