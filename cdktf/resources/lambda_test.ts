import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { S3Backend, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { s3BackendConfig } from '../types/tfstateconfig';
import { EcrRepository } from '@cdktf/provider-aws/lib/ecr-repository';
import { Resource } from '@cdktf/provider-null/lib/resource';
import { NullProvider } from '@cdktf/provider-null/lib/provider';
import { DataAwsEcrAuthorizationToken } from '@cdktf/provider-aws/lib/data-aws-ecr-authorization-token';

interface ecrConfig {
  region: string;
  projectPrefix: string;
  backendConfig: s3BackendConfig;
}

export class ecrStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: ecrConfig) {
    super(scope, id);

    const { region, projectPrefix, backendConfig } = config;

    // define resources here
    new AwsProvider(this, 'AWS', {
      region: region,
    });

    new NullProvider(this, 'null', {});

    const ecrRepo = new EcrRepository(this, 'ecrRepo', {
      name: 'lambda',
      imageTagMutability: 'MUTABLE',
      forceDelete: true,
      imageScanningConfiguration: {
        scanOnPush: true,
      },
    });

    const token = new DataAwsEcrAuthorizationToken(this, 'token', {});

    new Resource(this, 'ope1', {
      provisioners: [
        {
          type: 'local-exec',
          command: 'echo test111122222222222222222222',
        },
        {
          type: 'local-exec',
          command: `echo ${token.password}`,
        },
        {
          type: 'local-exec',
          command: `echo ${token.proxyEndpoint}`,
        },
      ],
    });
  }
}
