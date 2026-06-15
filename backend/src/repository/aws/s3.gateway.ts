import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  GetSignedDownloadUrlParams,
  IAwsS3Gateway,
  PutObjectParams,
} from './s3.interface';

@Injectable()
export class S3Gateway implements IAwsS3Gateway {
  private readonly client: S3Client;

  constructor(private readonly config: ConfigService) {
    const region = this.config.get<string>('FRONTERA_AWS_REGION') ?? 'us-east-1';
    this.client = new S3Client({ region });
  }

  async putObject(params: PutObjectParams): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
  }

  async getSignedDownloadUrl(params: GetSignedDownloadUrlParams): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
        ResponseContentDisposition: params.responseContentDisposition,
      }),
      { expiresIn: params.expiresInSeconds },
    );
  }
}
