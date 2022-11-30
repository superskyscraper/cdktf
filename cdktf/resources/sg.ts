import { securityGroup } from '@cdktf/provider-aws';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { SecurityGroup } from '@cdktf/provider-aws/lib/security-group';
import { S3Backend, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { s3BackendConfig } from '../types/tfstateconfig';

interface sgConfig {
  region: string;
  projectPrefix: string;
  backendConfig: s3BackendConfig;
  vpcId: string;
}

export class sgStack extends TerraformStack {
  public sgAccessDB: SecurityGroup;
  public sgDB: SecurityGroup;
  constructor(scope: Construct, id: string, config: sgConfig) {
    super(scope, id);

    const { region, projectPrefix, backendConfig, vpcId } = config;

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

    //security group to access DB
    this.sgAccessDB = new SecurityGroup(this, 'sgAccDB', {
      description: 'security group to access DB',
      vpcId: vpcId,
      egress: [
        {
          fromPort: 0,
          toPort: 0,
          protocol: '-1',
          cidrBlocks: ['0.0.0.0/0'],
        },
      ],
      tags: {
        Name: `${projectPrefix}-sgAccessDB`,
      },
    });

    //security group for postgres DB
    this.sgDB = new SecurityGroup(this, 'sgDB', {
      description: 'security group for postgres DB',
      vpcId: vpcId,
      ingress: [
        {
          fromPort: 5432,
          toPort: 5432,
          protocol: 'tcp',
          securityGroups: [this.sgAccessDB.id],
        },
      ],
      egress: [
        {
          fromPort: 0,
          toPort: 0,
          protocol: '-1',
          cidrBlocks: ['0.0.0.0/0'],
        },
      ],
      tags: {
        Name: `${projectPrefix}-sgDB`,
      },
    });
  }
}
