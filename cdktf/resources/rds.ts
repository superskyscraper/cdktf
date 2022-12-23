import { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';
import { DbProxy } from '@cdktf/provider-aws/lib/db-proxy';
import { DbProxyDefaultTargetGroup } from '@cdktf/provider-aws/lib/db-proxy-default-target-group';
import { DbProxyTarget } from '@cdktf/provider-aws/lib/db-proxy-target';
import { DbSubnetGroup } from '@cdktf/provider-aws/lib/db-subnet-group';
import { IamRole } from '@cdktf/provider-aws/lib/iam-role';
import { IamRolePolicy } from '@cdktf/provider-aws/lib/iam-role-policy';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { RdsCluster } from '@cdktf/provider-aws/lib/rds-cluster';
import { RdsClusterInstance } from '@cdktf/provider-aws/lib/rds-cluster-instance';
import { SecretsmanagerSecret } from '@cdktf/provider-aws/lib/secretsmanager-secret';
import { SecretsmanagerSecretVersion } from '@cdktf/provider-aws/lib/secretsmanager-secret-version';
import { S3Backend, TerraformStack, TerraformVariable } from 'cdktf';
import { Construct } from 'constructs';
import { s3BackendConfig } from '../types/tfstateconfig';

interface rdsConfig {
  region: string;
  projectPrefix: string;
  backendConfig: s3BackendConfig;
  subnetIds: string[];
  vpcSecurityGroupIdsForRds: string[];
  vpcSecurityGroupIdsForProxy: string[];
  useS3Backend?: boolean;
}

export class rdsStack extends TerraformStack {
  public rdsCluster: RdsCluster;
  public rdsClusterInstace: RdsClusterInstance;
  constructor(scope: Construct, id: string, config: rdsConfig) {
    super(scope, id);

    const { region, projectPrefix, backendConfig, subnetIds, vpcSecurityGroupIdsForRds,vpcSecurityGroupIdsForProxy, useS3Backend } = config;

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

    /**RDS設定 */

    /**
     * RDSを配置するサブネット
     */
    const dbSubnetGroup = new DbSubnetGroup(this, 'dbSubGrp', {
      subnetIds: subnetIds,
      tags: {
        Name: `${projectPrefix}-dbSubGrp`,
      },
    });

    /**
     * TF_VAR_masterUsername="hoge"をターミナルで定義する
     * あるいは.bashrcでexportする
     */
    const masterUsername = new TerraformVariable(this, 'masterUsername', {
      type: 'string',
      description: 'DB Username',
      sensitive: true,
    });

    const masterPassword = new TerraformVariable(this, 'masterPassword', {
      type: 'string',
      description: 'DB Password',
      sensitive: true,
    });

    const dbName = new TerraformVariable(this, 'dbName', {
      type: 'string',
      description: 'DB Name',
      sensitive: true,
    });

    /**
     * RDSクラスター
     */
    this.rdsCluster = new RdsCluster(this, 'rdsCluster', {
      clusterIdentifier: `${projectPrefix}serverless2`,
      engine: 'aurora-postgresql',
      engineMode: 'provisioned',
      engineVersion: '13.6',
      databaseName: dbName.stringValue,
      masterUsername: masterUsername.stringValue,
      masterPassword: masterPassword.stringValue,
      port: 5432,
      vpcSecurityGroupIds: vpcSecurityGroupIdsForRds,
      dbSubnetGroupName: dbSubnetGroup.name,
      skipFinalSnapshot: true,
      serverlessv2ScalingConfiguration: {
        maxCapacity: 8.0,
        minCapacity: 0.5,
      },
      tags: {
        Name: `${projectPrefix}ServerlessV2`,
      },
    });

    /**
     * RDSインスタンス
     */
    this.rdsClusterInstace = new RdsClusterInstance(this, 'rdsClusterInstance1', {
      clusterIdentifier: this.rdsCluster.id,
      instanceClass: 'db.serverless',
      engine: this.rdsCluster.engine,
      engineVersion: this.rdsCluster.engineVersion,
      dbSubnetGroupName: dbSubnetGroup.name,
    });

    /** * RDSプロキシ設定 */

    /**
     * secretsManagerの設定
     */
    const dbProxySecret = new SecretsmanagerSecret(this, 'dbProxySecret', {
      name: projectPrefix + 'Secrets2',
      recoveryWindowInDays: 0,
    });

    /**
     * secretsManagerにRDSの認証情報を登録
     */
    const dbProxySecretVersion = new SecretsmanagerSecretVersion(this, 'dbProxySecretVersion', {
      secretId: dbProxySecret.id,
      secretString: JSON.stringify({
        username: this.rdsCluster.masterUsername,
        password: this.rdsCluster.masterPassword,
        engine: this.rdsCluster.engine,
        host: this.rdsCluster.endpoint,
        port: this.rdsCluster.port,
        dbInstanceIdentifier: this.rdsCluster.id,
      }),
    });

    /** * IAM設定 */

    /**
     * RdsProxyがSecretsManagerに登録したRdsClusterの認証情報を読み取る許可を出す
     */
    const iamRoleForDBProxy = new IamRole(this, 'iamRoleForDBProxy', {
      name: 'DBProxyRole',
      assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'rds.amazonaws.com',
            },
          },
        ],
      }),
    });

    const dataForIamPolicyForDBProxy = new DataAwsIamPolicyDocument(this, 'dataForIamPolicyForDBProxy', {
      statement: [
        {
          effect: 'Allow',
          actions: ['kms:Decrypt'],
          resources: ['*'],
        },
        {
          effect: 'Allow',
          actions: [
            'secretsmanager:GetResourcePolicy',
            'secretsmanager:GetSecretValue',
            'secretsmanager:DescribeSecret',
            'secretsmanager:ListSecretVersionIds',
          ],
          resources: ['arn:aws:secretsmanager:*:*:*'],
        },
      ],
    });

    const iamRolePolicyForDBProxy = new IamRolePolicy(this, 'iamRolePolicyForDBProxy', {
      name: 'DBProxyRolePolicy',
      role: iamRoleForDBProxy.id,
      policy: dataForIamPolicyForDBProxy.json,
    });

    /** RDSProxy設定 */

    const dbProxy = new DbProxy(this, 'dbProxy', {
      name: `dbproxy`,
      debugLogging: false,
      engineFamily: 'POSTGRESQL',
      idleClientTimeout: 60,
      requireTls: false,
      roleArn: iamRoleForDBProxy.arn,
      vpcSecurityGroupIds:vpcSecurityGroupIdsForProxy,
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
      dbClusterIdentifier: this.rdsCluster.id,
      targetGroupName: dbProxyDefaultTargetGroup.name,
    });
  }
}
