import { DataAwsIamPolicy } from '@cdktf/provider-aws/lib/data-aws-iam-policy';
import { IamInstanceProfile } from '@cdktf/provider-aws/lib/iam-instance-profile';
import { IamRole } from '@cdktf/provider-aws/lib/iam-role';
import { IamRolePolicyAttachment } from '@cdktf/provider-aws/lib/iam-role-policy-attachment';
import { Instance } from '@cdktf/provider-aws/lib/instance';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { S3Backend, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { s3BackendConfig } from '../types/tfstateconfig';

interface bastionConfig {
  region: string;
  projectPrefix: string;
  backendConfig: s3BackendConfig;
  subnetId: string;
  vpcSecurityGroupIdsForEC2: string[];
  useS3Backend?: boolean;
}

export class bastionStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: bastionConfig) {
    super(scope, id);

    const { region, projectPrefix, backendConfig, subnetId, vpcSecurityGroupIdsForEC2, useS3Backend } =
      config;

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

    /**
     * IAM設定
     */
    const ssmRole = new IamRole(this, 'ssmRole', {
      name: 'ssmRole',
      // assumeRolePolicy: ssmAssumeRole.json,
      assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'ec2.amazonaws.com',
            },
          },
        ],
      }),
    });

    const systemManager = new DataAwsIamPolicy(this, 'sysManager', {
      arn: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore',
    });

    new IamRolePolicyAttachment(this, 'attachPolicy', {
      role: ssmRole.name,
      policyArn: systemManager.arn,
    });

    const ssmIAMInstanceProfile = new IamInstanceProfile(this, 'ssmIAMInstanceProfile', {
      name: 'ssmIAMInstanceProfile',
      role: ssmRole.name,
    });

    /**
     * SSM経由でのみ接続可能なEC2
     * [SSMについて]
     * 外部からSSM接続をするためにamazon-ssm-agentをインストールする
     * [Postgresqlについて]
     * 標準リポジトリのpostgresqlのバージョンが9.2.24でAuroraServerlessV2(13.6)に接続できない
     * EPELを使用しpostgresql13をインストールする
     */
    const publicEC2Instance = new Instance(this, 'pubEC2', {
      ami: 'ami-072bfb8ae2c884cc4',
      instanceType: 't2.micro',
      subnetId: subnetId,
      iamInstanceProfile: ssmIAMInstanceProfile.name,
      vpcSecurityGroupIds: vpcSecurityGroupIdsForEC2,
      associatePublicIpAddress: true,
      userData: `
        #!/bin/bash
        yum update -y
        yum update amazon-ssm-agent
        amazon-linux-extras install -y epel
        tee /etc/yum.repos.d/pgdg.repo<<EOF
        [pgdg13]
        name=PostgreSQL 13 for RHEL/CentOS 7 - x86_64
        baseurl=http://download.postgresql.org/pub/repos/yum/13/redhat/rhel-7-x86_64
        enabled=1
        gpgcheck=0
        EOF
        yum -y install postgresql13.x86_64
      `,
      tags: {
        Name: `${projectPrefix}-EC2`,
      },
    });
  }
}
