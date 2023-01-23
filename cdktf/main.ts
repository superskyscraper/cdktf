// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import { App } from 'cdktf';

import { bastionStack } from './resources/bastion';
import { rdsStack } from './resources/rds';
import { sgStack } from './resources/sg';
import { vpcStack } from './resources/vpc';
import { cloudfrontStack } from './resources/cloudfront';
import { cognitoStack } from './resources/cognito';

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

const bastion = new bastionStack(app, 'bastionStack', {
  region: region,
  projectPrefix: projectPrefix,
  backendConfig: tfstateConfigValues.bastion,
  subnetId: vpc.publicSubnet1a.id,
  vpcSecurityGroupIdsForEC2: [sg.sgAccessDB.id],
});

const rds = new rdsStack(app, 'rdsStack', {
  region: region,
  projectPrefix: projectPrefix,
  backendConfig: tfstateConfigValues.rds,
  subnetIds: [vpc.privateSubnet1a.id, vpc.privateSubnet1c.id],
  vpcSecurityGroupIdsForRds: [sg.sgDB.id],
  vpcSecurityGroupIdsForProxy: [sg.sgDBProxy.id],
});

const cloudfront = new cloudfrontStack(app, 'cloudfrontStack', {
  region: region,
  projectPrefix: projectPrefix,
  backendConfig: tfstateConfigValues.cloudfront,
});

// const cognito = new cognitoStack(app, 'cognitoStack', {
//   region: region,
//   projectPrefix: projectPrefix,
//   backendConfig: tfstateConfigValues.cognito,
// });

app.synth();
