import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { S3Backend, TerraformStack } from 'cdktf';
import { s3BackendConfig } from '../types/tfstateconfig';
import { Construct } from 'constructs';
import { SecretsmanagerSecret } from '@cdktf/provider-aws/lib/secretsmanager-secret';
import { SecretsmanagerSecretVersion } from '@cdktf/provider-aws/lib/secretsmanager-secret-version';
import { RdsCluster } from '@cdktf/provider-aws/lib/rds-cluster';

interface secretsManagerConfig {
  region: string;
  projectPrefix: string;
  backendConfig: s3BackendConfig;
  useS3Backend?: boolean;
  rdsCluster: RdsCluster;
}

export class secretsManagerStack extends TerraformStack {
  public dbProxySecret: SecretsmanagerSecret;
  constructor(scope: Construct, id: string, config: secretsManagerConfig) {
    super(scope, id);

    const { region, projectPrefix, backendConfig, useS3Backend, rdsCluster } = config;

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

    this.dbProxySecret = new SecretsmanagerSecret(this, 'dbProxySecret', {
      name: projectPrefix + 'Secrets2',
      recoveryWindowInDays: 0,
    });

    const dbProxySecretVersion = new SecretsmanagerSecretVersion(this, 'dbProxySecretVersion', {
      secretId: this.dbProxySecret.id,
      secretString: JSON.stringify({
        username: rdsCluster.masterUsername,
        password: rdsCluster.masterPassword,
        engine: rdsCluster.engine,
        host: rdsCluster.endpoint,
        port: rdsCluster.port,
        dbInstanceIdentifier: rdsCluster.id,
      }),
    });
  }
}
