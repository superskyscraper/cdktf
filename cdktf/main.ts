// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import { App } from 'cdktf';

import { ec2Stack } from './resources/ec2';
import { iamStack } from './resources/iam';
import { rdsStack } from './resources/rds';
import { sgStack } from './resources/sg';
import { vpcStack } from './resources/vpc';
import { rdsProxyStack } from './resources/rdsProxy';
import { projectPrefix, region, tfstateConfigValues } from './constants';

const app = new App();

const vpc = new vpcStack(app, 'vpcStack', {
  region: region,
  projectPrefix: projectPrefix,
  backendConfig: tfstateConfigValues.vpc,
});

const sg = new sgStack(app, 'sgStack', {
  region: region,
  projectPrefix: projectPrefix,
  backendConfig: tfstateConfigValues.sg,
  vpcId: vpc.mainVpc.id,
});

const iam = new iamStack(app, 'iamStack', {
  region: region,
  projectPrefix: projectPrefix,
  backendConfig: tfstateConfigValues.iam,
});

const ec2 = new ec2Stack(app, 'ec2Stack', {
  region: region,
  projectPrefix: projectPrefix,
  backendConfig: tfstateConfigValues.ec2,
  ssmIAMInstanceProfile: iam.ssmIAMInstanceProfile.name,
  subnetId: vpc.publicSubnet1a.id,
  vpcSecurityGroupIds: [sg.sgAccessDB.id],
});

const rds = new rdsStack(app, 'rdsStack', {
  region: region,
  projectPrefix: projectPrefix,
  backendConfig: tfstateConfigValues.rds,
  subnetIds: [vpc.privateSubnet1a.id, vpc.privateSubnet1c.id],
  vpcSecurityGroupIds: [sg.sgDB.id],
});

const proxy = new rdsProxyStack(app, 'rdsProxyStack', {
  region: region,
  projectPrefix: projectPrefix,
  backendConfig: tfstateConfigValues.proxy,
  subnetIds: [vpc.privateSubnet1a.id, vpc.privateSubnet1c.id],
  vpcSecurityGroupIds: [sg.sgDBProxy.id],
  rdsCluster: rds.rdsCluster,
  rdsClusterInstance: rds.rdsClusterInstace,
  dbProxyIamRole: iam.iamRoleForDBProxy,
});

app.synth();
