import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { S3Backend, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { s3BackendConfig } from '../types/tfstateconfig';
import { CognitoUserPool } from '@cdktf/provider-aws/lib/cognito-user-pool';

interface cognitoConfig {
  region: string;
  projectPrefix: string;
  backendConfig: s3BackendConfig;
  useS3Backend?: boolean;
}

export class cognitoStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: cognitoConfig) {
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

    const cognitoUserPool = new CognitoUserPool(this, 'cognitoUserPool', {
      name: `${projectPrefix}-Auth`,

      mfaConfiguration: 'OFF',

      aliasAttributes: ['email'],

      autoVerifiedAttributes: ['email'],

      adminCreateUserConfig: {
        allowAdminCreateUserOnly: false,
        inviteMessageTemplate: {
          emailMessage: ' ユーザー名は {username}、仮パスワードは {####} です。',
          emailSubject: ' 仮パスワード',
          smsMessage: ' ユーザー名は {username}、仮パスワードは {####} です。',
        },
      },

      emailConfiguration: {
        emailSendingAccount: 'COGNITO_DEFAULT',
      },

      passwordPolicy: {
        minimumLength: 8,
        requireLowercase: true,
        requireNumbers: false,
        requireSymbols: false,
        requireUppercase: false,
        temporaryPasswordValidityDays: 7,
      },

      schema: [
        {
          attributeDataType: 'String',
          name: 'email',
          required: true,
        },
        {
          attributeDataType: 'String',
          developerOnlyAttribute: false,
          mutable: true,
          name: 'company_id',
          required: false,
          stringAttributeConstraints: {
            maxLength: '256',
            minLength: '1',
          },
        },
      ],

      usernameConfiguration: {
        caseSensitive: false,
      },

      verificationMessageTemplate: {
        defaultEmailOption: 'CONFIRM_WITH_LINK',
        emailMessage: ' 検証コードは {####} です。',
        emailMessageByLink: ' E メールアドレスを検証するには、次のリンクをクリックしてください。{##Verify Email##} ',
        emailSubject: ' 検証コード',
        emailSubjectByLink: ' 検証リンク',
        smsMessage: ' 検証コードは {####} です。',
      },
    });
  }
}
