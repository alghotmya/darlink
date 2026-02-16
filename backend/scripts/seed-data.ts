/**
 * Seed data for DarLink (UAE, GCC, Egypt). Run after deploy.
 * Usage: TABLE_NAME=darlink-dev-data npx ts-node scripts/seed-data.ts
 * Or with AWS profile: AWS_PROFILE=xxx TABLE_NAME=darlink-dev-data npx ts-node scripts/seed-data.ts
 */
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const TABLE_NAME = process.env.TABLE_NAME || 'darlink-dev-data';
const client = new DynamoDBClient({});
const now = new Date().toISOString();

const orgId = 'org-seed-001';
const listingId = 'list-seed-001';

async function seed() {
  // Organization
  await client.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall({
        pk: `ORG#${orgId}`,
        sk: 'META',
        orgId,
        name: 'Seed Real Estate',
        type: 'landlord',
        countryCode: 'AE',
        region: 'UAE',
        createdAt: now,
        updatedAt: now,
        entityType: 'Organization',
      }),
    })
  );

  // One published listing (so public list and lead submit work)
  const listing = {
    pk: `ORG#${orgId}`,
    sk: `LISTING#${listingId}`,
    listingId,
    orgId,
    status: 'published',
    type: 'rent',
    title: 'Modern 2BR in Dubai Marina',
    description: 'Spacious apartment with sea view.',
    price: 120000,
    currency: 'AED',
    countryCode: 'AE',
    region: 'UAE',
    city: 'Dubai',
    area: 'Dubai Marina',
    bedrooms: 2,
    bathrooms: 2,
    areaSqm: 120,
    mediaKeys: [],
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    entityType: 'Listing',
    gsi1pk: 'PUBLIC#LISTINGS',
    gsi1sk: `published#AE#${now}`,
  };
  await client.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall(listing),
    })
  );

  // Copy for public get by id (ENTITY#LISTING#id)
  const publicListing = { ...listing, pk: `ENTITY#LISTING#${listingId}`, sk: `LISTING#${listingId}` };
  await client.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall(publicListing),
    })
  );

  console.log('Seed done. Org:', orgId, 'Listing:', listingId);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
