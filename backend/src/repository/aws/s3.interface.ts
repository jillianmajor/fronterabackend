export interface PutObjectParams {
  bucket: string;
  key: string;
  body: Buffer;
  contentType: string;
}

export interface GetSignedDownloadUrlParams {
  bucket: string;
  key: string;
  expiresInSeconds: number;
  responseContentDisposition?: string;
}

export interface IAwsS3Gateway {
  putObject(params: PutObjectParams): Promise<void>;
  getSignedDownloadUrl(params: GetSignedDownloadUrlParams): Promise<string>;
}
