import { securityGroup } from '@cdktf/provider-aws';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { SecurityGroup } from '@cdktf/provider-aws/lib/security-group';
import { TerraformStack } from 'cdktf';
import { Construct } from 'constructs';

interface sgConfig {
  region: string;
  projectPrefix: string;
  vpcId: string;
}

export class sgStack extends TerraformStack {
  public sgAccessDB: SecurityGroup;
  public sgDB: SecurityGroup;
  constructor(scope: Construct, id: string, config: sgConfig) {
    super(scope, id);

    const { region, projectPrefix, vpcId } = config;

    // define resources here
    new AwsProvider(this, 'AWS', {
      region: region,
    });

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
