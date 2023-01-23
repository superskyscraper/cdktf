import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { S3Backend, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { s3BackendConfig } from '../types/tfstateconfig';
import { CognitoUserPool } from '@cdktf/provider-aws/lib/cognito-user-pool';
import { CognitoUserPoolClient } from '@cdktf/provider-aws/lib/cognito-user-pool-client';

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

    /**
     * cognitoユーザプール
     */
    const cognitoUserPool = new CognitoUserPool(this, 'cognitoUserPool', {
      name: `${projectPrefix}-Auth`,

      /** MFAはOFFにする */
      mfaConfiguration: 'OFF',

      /** ユーザ確認の際にemailで自動検証を行う */
      autoVerifiedAttributes: ['email'],

      /** emailでサインイン可能にする */
      usernameAttributes: ['email'],

      adminCreateUserConfig: {
        /** 管理者以外のでのサインアップは禁止 */
        allowAdminCreateUserOnly: true,
        /** 正体メールのテンプレート */
        inviteMessageTemplate: {
          emailMessage: ' ユーザー名は {username}、仮パスワードは {####} です。',
          emailSubject: ' 仮パスワード',
          smsMessage: ' ユーザー名は {username}、仮パスワードは {####} です。',
        },
      },

      emailConfiguration: {
        /** メール配信の設定はデフォルトにする */
        emailSendingAccount: 'COGNITO_DEFAULT',
      },

      /** パスワードのポリシー */
      passwordPolicy: {
        minimumLength: 8,
        requireLowercase: true,
        requireNumbers: false,
        requireSymbols: false,
        requireUppercase: false,
        temporaryPasswordValidityDays: 7,
      },

      /**
       * パスワード再設定用の設定
       * emailを使用する
       */
      accountRecoverySetting: {
        recoveryMechanism: [
          {
            name: 'verified_email',
            priority: 1,
          },
        ],
      },

      /**
       * ユーザに付与する属性
       * emailは必須とする
       * カスタム属性は必須ではない
       */
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
        /** ユーザ名で大文字小文字を区別しない */
        caseSensitive: false,
      },

      /** パスワード再設定時のメール文面 */
      verificationMessageTemplate: {
        defaultEmailOption: 'CONFIRM_WITH_CODE',
        emailMessage: ' 検証コードは {####} です。',
        emailSubject: ' 検証コード',
        smsMessage: ' 検証コードは {####} です。',
      },
    });

    /** cognitoのアプリクライアント */
    const cognitoUserPoolClient = new CognitoUserPoolClient(this, 'cognitoUserPoolClient', {
      name: `${projectPrefix}-app`,
      userPoolId: cognitoUserPool.id,
      /** secretは使用しない */
      generateSecret: false,
      /** SRPとリフレッシュトークンだけ有効 */
      explicitAuthFlows: ['ALLOW_REFRESH_TOKEN_AUTH', 'ALLOW_USER_SRP_AUTH'],
      /** ユーザ存在エラーを防ぐ */
      preventUserExistenceErrors: 'ENABLED',
    });
  }
}
