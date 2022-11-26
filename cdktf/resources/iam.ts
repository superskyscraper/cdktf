import { DataAwsIamPolicy } from '@cdktf/provider-aws/lib/data-aws-iam-policy';
import { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';
import { IamInstanceProfile } from '@cdktf/provider-aws/lib/iam-instance-profile';
import { IamPolicy } from '@cdktf/provider-aws/lib/iam-policy';
import { IamRole } from '@cdktf/provider-aws/lib/iam-role';
import { IamRolePolicyAttachment } from '@cdktf/provider-aws/lib/iam-role-policy-attachment';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { TerraformStack } from 'cdktf';
import { Construct } from 'constructs';

interface iamConfig {
  region: string;
  projectPrefix: string;
}

export class iamStack extends TerraformStack {
  // public ssmIAMInstanceProfile: IamInstanceProfile;
  constructor(scope: Construct, id: string, config: iamConfig) {
    super(scope, id);

    const { region, projectPrefix } = config;

    // define resources here
    new AwsProvider(this, 'AWS', {
      region: region,
    });

    // const ssmAssumeRole = new DataAwsIamPolicyDocument(this, 'ssmAssumeRole', {
    //   statement: [
    //     {
    //       actions: ['sts.AssumeRole'],
    //       effect: 'Allow',
    //       principals: [
    //         {
    //           type: 'Service',
    //           identifiers: ['ec2.amazonaws.com'],
    //         },
    //       ],
    //     },
    //   ],
    // });

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
  }
}
