import type { tfstateConfig } from './types/tfstateconfig';

//リソースに紐づけるプロジェクト名
export const projectPrefix = 'cdktfsample';
//AWSリソースを配置するリージョン
export const region = 'ap-northeast-1';
//tfstateファイルを配置するS3バケット名
export const tfstateS3BucketName = 'myultrasupertfstatemanages3';
//tfstateファイルの排他ロックに使用するDynamoDB名
export const tfstateDynamoDBName = 'TerraformStateLockTable';

//各リソースのスタックでS3Backendに渡す設定値
export const tfstateConfigValues: tfstateConfig = {
  vpc: {
    bucket: tfstateS3BucketName,
    region: region,
    key: 'vpc/vpcStack.tfstate',
    dynamodbTable: `${tfstateDynamoDBName}-vpc`,
  },
  sg: {
    bucket: tfstateS3BucketName,
    region: region,
    key: 'sg/sgStack.tfstate',
    dynamodbTable: `${tfstateDynamoDBName}-sg`,
  },
  iam: {
    bucket: tfstateS3BucketName,
    region: region,
    key: 'iam/iamStack.tfstate',
    dynamodbTable: `${tfstateDynamoDBName}-iam`,
  },
  ec2: {
    bucket: tfstateS3BucketName,
    region: region,
    key: 'ec2/ec2Stack.tfstate',
    dynamodbTable: `${tfstateDynamoDBName}-ec2`,
  },
  rds: {
    bucket: tfstateS3BucketName,
    region: region,
    key: 'rds/rdsStack.tfstate',
    dynamodbTable: `${tfstateDynamoDBName}-rds`,
  },
  secretsmanager: {
    bucket: tfstateS3BucketName,
    region: region,
    key: 'secretsmanager/secretsManagerStack.tfstate',
    dynamodbTable: `${tfstateDynamoDBName}-secretsmanager`,
  },
  rdsproxy: {
    bucket: tfstateS3BucketName,
    region: region,
    key: 'rdsproxy/rdsProxyStack.tfstate',
    dynamodbTable: `${tfstateDynamoDBName}-rdsproxy`,
  },
  s3: {
    bucket: tfstateS3BucketName,
    region: region,
    key: 's3/s3Stack.tfstate',
    dynamodbTable: `${tfstateDynamoDBName}-s3`,
  },
  cloudfront: {
    bucket: tfstateS3BucketName,
    region: region,
    key: 'cloudfront/cloudFrontStack.tfstate',
    dynamodbTable: `${tfstateDynamoDBName}-cloudfront`,
  },
};
