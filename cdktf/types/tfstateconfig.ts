export interface s3BackendConfig {
  bucket: string;
  region: string;
  key: string;
  dynamodbTable: string;
}

export interface tfstateConfig {
  vpc: s3BackendConfig;
  sg: s3BackendConfig;
  iam: s3BackendConfig;
  ec2: s3BackendConfig;
  rds: s3BackendConfig;
  secretsmanager: s3BackendConfig;
  rdsproxy: s3BackendConfig;
}
