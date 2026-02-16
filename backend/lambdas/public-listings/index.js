const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, Query, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  const path = event.path || event.requestContext?.http?.path || '';
  const idMatch = path.match(/\/public\/listings\/([^/]+)/);
  const listingId = idMatch ? idMatch[1] : null;

  if (listingId && !path.endsWith('/leads')) {
    return getListingById(listingId);
  }

  const qs = event.queryStringParameters || {};
  const country = qs.country;
  const listingType = qs.type || qs.listingType;
  const limit = Math.min(parseInt(qs.limit || '20', 10), 50);
  const nextToken = qs.nextToken;

  return listPublicListings({ country, listingType, limit, nextToken });
};

async function getListingById(listingId) {
  const pk = `ENTITY#LISTING#${listingId}`;
  const { Item } = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk: `LISTING#${listingId}` },
    })
  );
  if (!Item) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Listing not found' }) };
  }
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(normalizeListing(Item)),
  };
}

async function listPublicListings({ country, listingType, limit, nextToken }) {
  const gsi1pk = 'PUBLIC#LISTINGS';
  let gsi1sk = 'published';
  if (country) gsi1sk = `published#${country}`;
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'gsi-public-listings',
    KeyConditionExpression: 'gsi1pk = :pk AND begins_with(gsi1sk, :sk)',
    ExpressionAttributeValues: { ':pk': gsi1pk, ':sk': gsi1sk },
    Limit: limit,
  };
  if (nextToken) params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());

  const result = await client.send(new Query(params));
  const items = (result.Items || []).map(normalizeListing);
  const next = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : null;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ listings: items, nextToken: next }),
  };
}

function normalizeListing(item) {
  if (!item) return null;
  return {
    listingId: item.listingId,
    orgId: item.orgId,
    status: item.status,
    type: item.type,
    title: item.title,
    description: item.description,
    price: item.price,
    currency: item.currency,
    countryCode: item.countryCode,
    region: item.region,
    city: item.city,
    area: item.area,
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    areaSqm: item.areaSqm,
    mediaKeys: item.mediaKeys || [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    publishedAt: item.publishedAt,
  };
}
