import { Instance } from '@cdktf/provider-aws/lib/instance';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { S3Backend, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { s3BackendConfig } from '../types/tfstateconfig';

interface ec2Config {
  region: string;
  projectPrefix: string;
  backendConfig: s3BackendConfig;
  ssmIAMInstanceProfile: string;
  subnetId: string;
  vpcSecurityGroupIds: string[];
}

export class ec2Stack extends TerraformStack {
  constructor(scope: Construct, id: string, config: ec2Config) {
    super(scope, id);

    const { region, projectPrefix, ssmIAMInstanceProfile, backendConfig, subnetId, vpcSecurityGroupIds } = config;

    // define resources here
    new AwsProvider(this, 'AWS', {
      region: region,
    });

    new S3Backend(this, {
      bucket: backendConfig.bucket,
      key: backendConfig.key,
      region: backendConfig.region,
      dynamodbTable: backendConfig.dynamodbTable,
    });

    //EC2 which can be accessed via only ssm
    const publicEC2Instance = new Instance(this, 'pubEC2', {
      ami: 'ami-072bfb8ae2c884cc4',
      instanceType: 't2.micro',
      subnetId: subnetId,
      iamInstanceProfile: ssmIAMInstanceProfile,
      vpcSecurityGroupIds: vpcSecurityGroupIds,
      associatePublicIpAddress: true,
      userData: `
        #!/bin/bash
        yum update -y
        yum update amazon-ssm-agent
      `,
      tags: {
        Name: `${projectPrefix}-EC2`,
      },
    });
  }
}
