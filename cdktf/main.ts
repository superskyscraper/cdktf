// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import { App } from 'cdktf';

import { ec2Stack } from './resources/ec2';
import { iamStack } from './resources/iam';
import { sgStack } from './resources/sg';
import { vpcStack } from './resources/vpc';

const projectPrefix = 'cdktfsample';
const region = 'ap-northeast-1';

const app = new App();

const vpc = new vpcStack(app, 'vpcStack', {
  region: region,
  projectPrefix: projectPrefix,
});

const sg = new sgStack(app, 'sgStack', {
  region: region,
  projectPrefix: projectPrefix,
  vpcId: vpc.mainVpc.id,
});

const iam = new iamStack(app, 'iamStack', {
  region: region,
  projectPrefix: projectPrefix,
});

const ec2 = new ec2Stack(app, 'ec2Stack', {
  region: region,
  projectPrefix: projectPrefix,
  ssmIAMInstanceProfile: iam.ssmIAMInstanceProfile.name,
  publicSubnetId: vpc.publicSubnet1a.id,
  securityGroupId: sg.sgAccessDB.id,
});

app.synth();
