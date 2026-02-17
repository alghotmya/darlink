import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface DarlinkStackProps extends cdk.StackProps {
  envName: string;
}

export class DarlinkStack extends cdk.Stack {
  public readonly table: dynamodb.Table;
  public readonly bucket: s3.Bucket;
  public readonly userPool: cognito.UserPool;
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: DarlinkStackProps) {
    super(scope, id, props);

    const { envName } = props;

    // ——— Cognito ———
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `darlink-${envName}-pool`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: false, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
      },
    });

    const userPoolClient = this.userPool.addClient('WebClient', {
      userPoolClientName: `darlink-${envName}-web`,
      authFlows: { userPassword: true, userSrp: true },
      generateSecret: false,
    });

    // ——— DynamoDB single table ———
    this.table = new dynamodb.Table(this, 'Table', {
      tableName: `darlink-${envName}-data`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: envName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // GSI: list listings by org
    this.table.addGlobalSecondaryIndex({
      indexName: 'gsi-org-listings',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'listingStatus', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI: public listings by status (pk = ENTITY#LISTING, sk = status#created)
    this.table.addGlobalSecondaryIndex({
      indexName: 'gsi-public-listings',
      partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI: org audit by time
    this.table.addGlobalSecondaryIndex({
      indexName: 'gsi-org-audit',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'auditTime', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ——— S3 media bucket ———
    this.bucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: `darlink-${envName}-media-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: envName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // ——— API Gateway ———
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: `darlink-${envName}-api`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // ——— Lambda: public listings list + get ———
    const publicListingsHandler = new lambda.Function(this, 'PublicListingsHandler', {
      functionName: `darlink-${envName}-public-listings`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/public-listings'),
      environment: {
        TABLE_NAME: this.table.tableName,
        BUCKET_NAME: this.bucket.bucketName,
      },
    });
    this.table.grantReadData(publicListingsHandler);
    this.bucket.grantRead(publicListingsHandler);

    const publicListings = this.api.root.addResource('public').addResource('listings');
    publicListings.addMethod('GET', new apigateway.LambdaIntegration(publicListingsHandler));
    const publicListingId = publicListings.addResource('{id}');
    publicListingId.addMethod('GET', new apigateway.LambdaIntegration(publicListingsHandler));

    // ——— Lambda: public lead submit ———
    const publicLeadHandler = new lambda.Function(this, 'PublicLeadHandler', {
      functionName: `darlink-${envName}-public-lead`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/public-lead'),
      environment: {
        TABLE_NAME: this.table.tableName,
      },
    });
    this.table.grantReadWriteData(publicLeadHandler);

    publicListingId.addResource('leads').addMethod('POST', new apigateway.LambdaIntegration(publicLeadHandler));

    // ——— Lambda: health / me placeholder (no auth for MVP minimal) ———
    const meHandler = new lambda.Function(this, 'MeHandler', {
      functionName: `darlink-${envName}-me`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/me'),
      environment: {
        TABLE_NAME: this.table.tableName,
        USER_POOL_ID: this.userPool.userPoolId,
      },
    });
    this.table.grantReadData(meHandler);

    this.api.root.addResource('me').addMethod('GET', new apigateway.LambdaIntegration(meHandler));

    // ——— Admin: org listings CRUD + media presign ———
    const orgListingsHandler = new lambda.Function(this, 'OrgListingsHandler', {
      functionName: `darlink-${envName}-org-listings`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/org-listings'),
      environment: {
        TABLE_NAME: this.table.tableName,
        ADMIN_API_KEY: process.env.ADMIN_API_KEY || '',
      },
    });
    this.table.grantReadWriteData(orgListingsHandler);

    const orgListingMediaHandler = new lambda.Function(this, 'OrgListingMediaHandler', {
      functionName: `darlink-${envName}-org-listing-media`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/org-listing-media'),
      environment: {
        TABLE_NAME: this.table.tableName,
        BUCKET_NAME: this.bucket.bucketName,
        ADMIN_API_KEY: process.env.ADMIN_API_KEY || '',
      },
    });
    this.table.grantReadData(orgListingMediaHandler);
    this.bucket.grantPut(orgListingMediaHandler);

    const orgs = this.api.root.addResource('orgs');
    const orgId = orgs.addResource('{orgId}');
    const listings = orgId.addResource('listings');
    listings.addMethod('GET', new apigateway.LambdaIntegration(orgListingsHandler));
    listings.addMethod('POST', new apigateway.LambdaIntegration(orgListingsHandler));
    const listingId = listings.addResource('{listingId}');
    listingId.addMethod('GET', new apigateway.LambdaIntegration(orgListingsHandler));
    listingId.addMethod('PUT', new apigateway.LambdaIntegration(orgListingsHandler));
    listingId.addMethod('DELETE', new apigateway.LambdaIntegration(orgListingsHandler));
    const media = listingId.addResource('media');
    const presign = media.addResource('presign');
    presign.addMethod('POST', new apigateway.LambdaIntegration(orgListingMediaHandler));

    // ——— Outputs ———
    new cdk.CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId, description: 'Cognito User Pool ID' });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito App Client ID',
    });
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
    });
    new cdk.CfnOutput(this, 'TableName', { value: this.table.tableName, description: 'DynamoDB Table' });
    new cdk.CfnOutput(this, 'BucketName', { value: this.bucket.bucketName, description: 'S3 Media Bucket' });
  }
}
