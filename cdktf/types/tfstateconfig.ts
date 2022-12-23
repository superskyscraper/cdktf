export interface s3BackendConfig {
  bucket: string;
  region: string;
  key: string;
  dynamodbTable: string;
}

export interface tfstateConfig {
  vpc: s3BackendConfig;
  sg: s3BackendConfig;
  bastion: s3BackendConfig;
  rds: s3BackendConfig;
  cloudfront: s3BackendConfig;
}
