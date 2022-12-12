import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { S3Backend, TerraformStack } from 'cdktf';
import { s3BackendConfig } from '../types/tfstateconfig';
import { Construct } from 'constructs';
import { SecretsmanagerSecret } from '@cdktf/provider-aws/lib/secretsmanager-secret';
import { RdsCluster } from '@cdktf/provider-aws/lib/rds-cluster';
import { DbProxy } from '@cdktf/provider-aws/lib/db-proxy';
import { DbProxyDefaultTargetGroup } from '@cdktf/provider-aws/lib/db-proxy-default-target-group';
import { DbProxyTarget } from '@cdktf/provider-aws/lib/db-proxy-target';
import { IamRole } from '@cdktf/provider-aws/lib/iam-role';

interface rdsProxyConfig {
  region: string;
  projectPrefix: string;
  backendConfig: s3BackendConfig;
  subnetIds: string[];
  vpcSecurityGroupIds: string[];
  useS3Backend?: boolean;
  rdsCluster: RdsCluster;
  dbProxyIamRole: IamRole;
  dbProxySecret: SecretsmanagerSecret;
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
      dbProxyIamRole,
      dbProxySecret,
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

    //RDSProxy
    const dbProxy = new DbProxy(this, 'dbProxy', {
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
