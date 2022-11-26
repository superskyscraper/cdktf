import { Instance } from '@cdktf/provider-aws/lib/instance';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { TerraformStack } from 'cdktf';
import { Construct } from 'constructs';

interface ec2Config {
  region: string;
  projectPrefix: string;
  ssmIAMInstanceProfile: string;
  publicSubnetId: string;
  securityGroupId: string;
}

export class ec2Stack extends TerraformStack {
  constructor(scope: Construct, id: string, config: ec2Config) {
    super(scope, id);

    const { region, projectPrefix, ssmIAMInstanceProfile, publicSubnetId, securityGroupId } = config;

    // define resources here
    new AwsProvider(this, 'AWS', {
      region: region,
    });

    //EC2 which can be accessed via only ssm
    const publicEC2Instance = new Instance(this, 'pubEC2', {
      ami: 'ami-072bfb8ae2c884cc4',
      instanceType: 't2.micro',
      subnetId: publicSubnetId,
      iamInstanceProfile: ssmIAMInstanceProfile,
      securityGroups: [securityGroupId],
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
