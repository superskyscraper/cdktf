import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { S3Backend, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { s3BackendConfig } from '../types/tfstateconfig';

interface s3Config {
  region: string;
  projectPrefix: string;
  backendConfig: s3BackendConfig;
  useS3Backend?: boolean;
}

export class s3Stack extends TerraformStack {
  constructor(scope: Construct, id: string, config: s3Config) {
    super(scope, id);

    const { region, projectPrefix, backendConfig, useS3Backend } = config;

    // define resources here
    new AwsProvider(this, 'AWS', {
      region: region,
    });

    if (useS3Backend) {
      new S3Backend(this, {
        bucket: backendConfig.bucket,
        key: backendConfig.key,
        region: backendConfig.region,
        dynamodbTable: backendConfig.dynamodbTable,
      });
    }
  }
}
