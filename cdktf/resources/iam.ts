import { DataAwsIamPolicy } from '@cdktf/provider-aws/lib/data-aws-iam-policy';
import { IamInstanceProfile } from '@cdktf/provider-aws/lib/iam-instance-profile';
import { IamRole } from '@cdktf/provider-aws/lib/iam-role';
import { IamRolePolicyAttachment } from '@cdktf/provider-aws/lib/iam-role-policy-attachment';
import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { S3Backend, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { s3BackendConfig } from '../types/tfstateconfig';
import { IamRolePolicy } from '@cdktf/provider-aws/lib/iam-role-policy';
import { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';

interface iamConfig {
  region: string;
  projectPrefix: string;
  backendConfig: s3BackendConfig;
  useS3Backend?: boolean;
}

export class iamStack extends TerraformStack {
  public ssmIAMInstanceProfile: IamInstanceProfile;
  public iamRoleForDBProxy: IamRole;
  constructor(scope: Construct, id: string, config: iamConfig) {
    super(scope, id);

    const { region, projectPrefix, backendConfig, useS3Backend } = config;

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

    //ここからEC2にSSM接続するためのIAM設定
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

    this.ssmIAMInstanceProfile = new IamInstanceProfile(this, 'ssmIAMInstanceProfile', {
      name: 'ssmIAMInstanceProfile',
      role: ssmRole.name,
    });

    /**
     * ここからRdsProxyとRdsClusterをつなぐIAM設定;
     * RdsProxyがSecretsManagerに登録したRdsClusterの認証情報を読み取る許可を出す
     */
    this.iamRoleForDBProxy = new IamRole(this, 'iamRoleForDBProxy', {
      name: 'DBProxyRole',
      assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'rds.amazonaws.com',
            },
          },
        ],
      }),
    });

    const dataForIamPolicyForDBProxy = new DataAwsIamPolicyDocument(this, 'dataForIamPolicyForDBProxy', {
      statement: [
        {
          effect: 'Allow',
          actions: ['kms:Decrypt'],
          resources: ['*'],
        },
        {
          effect: 'Allow',
          actions: [
            'secretsmanager:GetResourcePolicy',
            'secretsmanager:GetSecretValue',
            'secretsmanager:DescribeSecret',
            'secretsmanager:ListSecretVersionIds',
          ],
          resources: ['arn:aws:secretsmanager:*:*:*'],
        },
      ],
    });

    const iamRolePolicyForDBProxy = new IamRolePolicy(this, 'iamRolePolicyForDBProxy', {
      name: 'DBProxyRolePolicy',
      role: this.iamRoleForDBProxy.id,
      policy: dataForIamPolicyForDBProxy.json,
    });
  }
}
