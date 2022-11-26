import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { TerraformStack } from 'cdktf';
import { Construct } from 'constructs';

interface sgConfig {
  region: string;
  projectPrefix: string;
  vpcId: string;
}

export class vpcStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: sgConfig) {
    super(scope, id);

    const { region, projectPrefix, vpcId } = config;

    // define resources here
    new AwsProvider(this, 'AWS', {
      region: region,
    });
  }
}
