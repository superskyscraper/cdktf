import { Construct } from 'constructs';
import { S3Backend, TerraformStack } from 'cdktf';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { Vpc } from '@cdktf/provider-aws/lib/vpc';
import { Subnet } from '@cdktf/provider-aws/lib/subnet';
import { RouteTable } from '@cdktf/provider-aws/lib/route-table';
import { InternetGateway } from '@cdktf/provider-aws/lib/internet-gateway';
import { RouteTableAssociation } from '@cdktf/provider-aws/lib/route-table-association';
import { s3BackendConfig } from '../types/tfstateconfig';

interface vpcConfig {
  region: string;
  projectPrefix: string;
  backendConfig: s3BackendConfig;
}

export class vpcStack extends TerraformStack {
  public mainVpc: Vpc;
  public publicSubnet1a: Subnet;
  public privateSubnet1a: Subnet;
  public privateSubnet1c: Subnet;
  constructor(scope: Construct, id: string, config: vpcConfig) {
    super(scope, id);

    const { region, projectPrefix, backendConfig } = config;

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

    //VPC
    this.mainVpc = new Vpc(this, 'mainVpc', {
      cidrBlock: '10.0.0.0/16',
      enableDnsHostnames: true,
      tags: {
        Name: `${projectPrefix}-VPC`,
      },
    });

    //subnet
    this.publicSubnet1a = new Subnet(this, 'pubSub1a', {
      vpcId: this.mainVpc.id,
      cidrBlock: '10.0.1.0/24',
      availabilityZone: 'ap-northeast-1a',
      tags: {
        Name: `${projectPrefix}-pubSub1a`,
      },
    });

    this.privateSubnet1a = new Subnet(this, 'priSub1a', {
      vpcId: this.mainVpc.id,
      cidrBlock: '10.0.2.0/24',
      availabilityZone: 'ap-northeast-1a',
      tags: {
        Name: `${projectPrefix}-pubSub1a`,
      },
    });

    this.privateSubnet1c = new Subnet(this, 'priSub1c', {
      vpcId: this.mainVpc.id,
      cidrBlock: '10.0.3.0/24',
      availabilityZone: 'ap-northeast-1c',
      tags: {
        Name: `${projectPrefix}-priSub1c`,
      },
    });

    //IGW
    const internetGateway = new InternetGateway(this, 'IGW', {
      vpcId: this.mainVpc.id,
      tags: {
        Name: `${projectPrefix}-IGW`,
      },
    });

    //routetable
    const publicRouteTable = new RouteTable(this, 'pubRTB', {
      vpcId: this.mainVpc.id,
      route: [
        {
          cidrBlock: '0.0.0.0/0',
          gatewayId: internetGateway.id,
        },
      ],
      tags: {
        Name: `${projectPrefix}-pubRTB`,
      },
    });

    const privateRouteTable = new RouteTable(this, 'priRTB', {
      vpcId: this.mainVpc.id,
      tags: {
        Name: `${projectPrefix}-priRTB`,
      },
    });

    //routetable associate
    new RouteTableAssociation(this, 'pubAssociate', {
      routeTableId: publicRouteTable.id,
      subnetId: this.publicSubnet1a.id,
    });

    new RouteTableAssociation(this, 'priAssociate1a', {
      routeTableId: privateRouteTable.id,
      subnetId: this.privateSubnet1a.id,
    });

    new RouteTableAssociation(this, 'priAssociate1c', {
      routeTableId: privateRouteTable.id,
      subnetId: this.privateSubnet1c.id,
    });
  }
}
