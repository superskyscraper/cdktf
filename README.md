# cdktf

### CDK for Terraform

- デプロイ  
`cdktf deploy <stackName...>`  
- リソースの削除  
`cdktf destroy <stackName...>`  

### AWS SSM接続

- 接続開始  
`aws ssm start-session --target i-xxxxxxxxxxxxxxxxx`  
- SSM接続＋ポートフォワード  
`aws ssm start-session --target i-xxxxxxxxxxxxxxxxx  --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters '{"host":["mydb.example.us-east-2.rds.amazonaws.com"],"portNumber":["5432"], "localPortNumber":["5432"]}'`  
- 接続終了  
`aws ssm terminate-session --session-id i-xxxxxxxxxxxxxxxxx`  

### SSM接続後EC2

- ユーザ変更
`sudo su --login ec2-user`

### DB接続
`psql -h localhost -p 5432 -U postgres -d postgres`