#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DarlinkStack } from '../lib/darlink-stack';

const app = new cdk.App();
const envName = app.node.tryGetContext('env') || 'dev';

new DarlinkStack(app, `DarlinkStack-${envName}`, {
  envName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'me-south-1',
  },
});
