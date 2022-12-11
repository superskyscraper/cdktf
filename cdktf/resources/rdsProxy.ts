import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { S3Backend, TerraformStack, TerraformVariable } from 'cdktf';
import { s3BackendConfig } from '../types/tfstateconfig';
import { Construct } from 'constructs';
import { SecretsmanagerSecret } from '@cdktf/provider-aws/lib/secretsmanager-secret';
import { SecretsmanagerSecretVersion } from '@cdktf/provider-aws/lib/secretsmanager-secret-version';
import { RdsCluster } from '@cdktf/provider-aws/lib/rds-cluster';
import { DbProxy } from '@cdktf/provider-aws/lib/db-proxy';
import { DbProxyDefaultTargetGroup } from '@cdktf/provider-aws/lib/db-proxy-default-target-group';
import { DbProxyTarget } from '@cdktf/provider-aws/lib/db-proxy-target';
import { IamRole } from '@cdktf/provider-aws/lib/iam-role';
import { RdsClusterInstance } from '@cdktf/provider-aws/lib/rds-cluster-instance';

interface rdsProxyConfig {
  region: string;
  projectPrefix: string;
  backendConfig: s3BackendConfig;
  subnetIds: string[];
  vpcSecurityGroupIds: string[];
  useS3Backend?: boolean;
  rdsCluster: RdsCluster;
  rdsClusterInstance: RdsClusterInstance;
  dbProxyIamRole: IamRole;
}

export class rdsProxyStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: rdsProxyConfig) {
    super(scope, id);

    const {
      region,
      projectPrefix,
      backendConfig,
      subnetIds,
      vpcSecurityGroupIds,
      useS3Backend,
      rdsCluster,
      rdsClusterInstance,
      dbProxyIamRole,
    } = config;

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

    const dbProxySecret = new SecretsmanagerSecret(this, 'dbProxySecret', {
      name: projectPrefix + 'Secrets',
      recoveryWindowInDays: 0,
    });

    const dbProxySecretVersion = new SecretsmanagerSecretVersion(this, 'dbProxySecretVersion', {
      secretId: dbProxySecret.id,
      secretString: JSON.stringify({
        username: rdsCluster.masterUsername,
        password: rdsCluster.masterPassword,
        engine: rdsCluster.engine,
        host: rdsCluster.endpoint,
        port: rdsCluster.port,
        dbInstanceIdentifier: rdsCluster.id,
      }),
    });

    const dbProxy = new DbProxy(this, 'dbProxy', {
      // dependsOn: [rdsClusterInstance],
      name: `dbproxy`,
      debugLogging: false,
      engineFamily: 'POSTGRESQL',
      idleClientTimeout: 60,
      requireTls: false,
      roleArn: dbProxyIamRole.arn,
      vpcSecurityGroupIds: vpcSecurityGroupIds,
      vpcSubnetIds: subnetIds,
      auth: [
        {
          authScheme: 'SECRETS',
          iamAuth: 'DISABLED',
          secretArn: dbProxySecret.arn,
        },
      ],
    });

    const dbProxyDefaultTargetGroup = new DbProxyDefaultTargetGroup(this, 'dbProxyDefaultTargetGroup', {
      dbProxyName: dbProxy.name,
      connectionPoolConfig: {
        connectionBorrowTimeout: 120,
        maxConnectionsPercent: 100,
        maxIdleConnectionsPercent: 50,
      },
    });

    const dbProxyTarget = new DbProxyTarget(this, 'dbProxyTarget', {
      dbProxyName: dbProxy.name,
      dbClusterIdentifier: rdsCluster.id,
      targetGroupName: dbProxyDefaultTargetGroup.name,
    });
  }
}
