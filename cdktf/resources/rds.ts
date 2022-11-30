import { DbSubnetGroup } from '@cdktf/provider-aws/lib/db-subnet-group';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { RdsCluster } from '@cdktf/provider-aws/lib/rds-cluster';
import { RdsClusterInstance } from '@cdktf/provider-aws/lib/rds-cluster-instance';
import { S3Backend, TerraformStack, TerraformVariable } from 'cdktf';
import { Construct } from 'constructs';
import { s3BackendConfig } from '../types/tfstateconfig';

interface rdsConfig {
  region: string;
  projectPrefix: string;
  backendConfig: s3BackendConfig;
  subnetIds: string[];
  vpcSecurityGroupIds: string[];
}

export class rdsStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: rdsConfig) {
    super(scope, id);

    const { region, projectPrefix, backendConfig, subnetIds, vpcSecurityGroupIds } = config;

    // define resources here
    new AwsProvider(this, 'AWS', {
      region: region,
    });

    // new S3Backend(this, {
    //   bucket: backendConfig.bucket,
    //   key: backendConfig.key,
    //   region: backendConfig.region,
    //   dynamodbTable: backendConfig.dynamodbTable,
    // });

    const dbSubnetGroup = new DbSubnetGroup(this, 'dbSubGrp', {
      subnetIds: subnetIds,
      tags: {
        Name: `${projectPrefix}-dbSubGrp`,
      },
    });

    //TF_VAR_masterUsername="hoge"をターミナルで定義する
    //あるいは.bashrcでexportする
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

    const rdsCluster = new RdsCluster(this, 'rdsCluster', {
      clusterIdentifier: `${projectPrefix}serverless2`,
      engine: 'aurora-postgresql',
      engineMode: 'provisioned',
      engineVersion: '13.6',
      databaseName: dbName.stringValue,
      masterUsername: masterUsername.stringValue,
      masterPassword: masterPassword.stringValue,
      port: 5432,
      vpcSecurityGroupIds: vpcSecurityGroupIds,
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

    new RdsClusterInstance(this, 'rdsClusterInstance1', {
      clusterIdentifier: rdsCluster.id,
      instanceClass: 'db.serverless',
      engine: rdsCluster.engine,
      engineVersion: rdsCluster.engineVersion,
      dbSubnetGroupName: dbSubnetGroup.name,
    });
  }
}
