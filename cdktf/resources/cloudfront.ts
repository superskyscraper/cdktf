import { AwsProvider } from '@cdktf/provider-aws/lib/provider';
import { S3Backend, TerraformStack } from 'cdktf';
import { Construct } from 'constructs';
import { s3BackendConfig } from '../types/tfstateconfig';
import { S3BucketPublicAccessBlock } from '@cdktf/provider-aws/lib/s3-bucket-public-access-block';
import { S3Bucket } from '@cdktf/provider-aws/lib/s3-bucket';
import { CloudfrontOriginAccessControl } from '@cdktf/provider-aws/lib/cloudfront-origin-access-control';
import { CloudfrontDistribution } from '@cdktf/provider-aws/lib/cloudfront-distribution';
import { DataAwsIamPolicyDocument } from '@cdktf/provider-aws/lib/data-aws-iam-policy-document';
import { S3BucketPolicy } from '@cdktf/provider-aws/lib/s3-bucket-policy';

interface cloudfrontConfig {
  region: string;
  projectPrefix: string;
  backendConfig: s3BackendConfig;
  useS3Backend?: boolean;
}

export class cloudfrontStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: cloudfrontConfig) {
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
     * CloudfrontのオリジンとなるS3バケット
     */
    const originS3Bucket = new S3Bucket(this, 'originS3Bucket', {
      bucket: `${projectPrefix}-cf-oac-with-cdktf-example`,
      //バケット内にオブジェクトが存在していても強制的にdestroy可能
      forceDestroy: true,
    });

    /**
     * Cftオリジンバケットのパブリックアクセス設定
     */
    const originS3BucketPublicAccessBlock = new S3BucketPublicAccessBlock(this, 'originS3BucketPublicAccessBlock', {
      bucket: originS3Bucket.id,
      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    });

    /**
     * OAC設定
     */
    const cloudfrontOriginAccessControl = new CloudfrontOriginAccessControl(this, 'cloudfrontOriginAccessControl', {
      name: `${projectPrefix}-cf-oac-with-cdktf-example`,
      originAccessControlOriginType: 's3',
      signingBehavior: 'always',
      signingProtocol: 'sigv4',
    });

    /**
     * Cftディストリビューションの設定
     */
    const cloudfrontDistribution = new CloudfrontDistribution(this, 'cloudfrontDistribution', {
      enabled: true,
      origin: [
        {
          originId: originS3Bucket.id,
          domainName: originS3Bucket.bucketRegionalDomainName,
          originAccessControlId: cloudfrontOriginAccessControl.id,
        },
      ],
      viewerCertificate: {
        cloudfrontDefaultCertificate: true,
      },
      defaultCacheBehavior: {
        targetOriginId: originS3Bucket.id,
        viewerProtocolPolicy: 'redirect-to-https',
        cachedMethods: ['GET', 'HEAD'],
        allowedMethods: ['GET', 'HEAD'],
        forwardedValues: {
          queryString: false,
          headers: [],
          cookies: {
            forward: 'none',
          },
        },
      },
      restrictions: {
        geoRestriction: {
          restrictionType: 'none',
        },
      },
      defaultRootObject: 'index.html',
    });

    /**
     * 上記で定義したCftディストリビューションからのみ、S3オリジンバケットへのGetObjectを許可
     */
    const s3BucketPolicyData = new DataAwsIamPolicyDocument(this, 's3BucketPolicyData', {
      statement: [
        {
          principals: [
            {
              type: 'Service',
              identifiers: ['cloudfront.amazonaws.com'],
            },
          ],
          actions: ['s3:GetObject'],
          resources: [`${originS3Bucket.arn}/*`],
          condition: [
            {
              test: 'StringEquals',
              variable: 'aws:SourceArn',
              values: [cloudfrontDistribution.arn],
            },
          ],
        },
      ],
    });

    /**
     * S3オリジンバケットにバケットポリシーを適用
     */
    const originS3BucketPolicy = new S3BucketPolicy(this, 'originS3BucketPolicy', {
      bucket: originS3Bucket.id,
      policy: s3BucketPolicyData.json,
    });
  }
}
