const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, Query, GetCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

const SUPPORTED_COUNTRIES = ['AE', 'SA', 'BH', 'KW', 'OM', 'QA', 'EG'];
const LISTING_STATUSES = ['draft', 'published', 'paused', 'archived', 'leased', 'sold'];
const LISTING_TYPES = ['rent', 'sale'];

function cors() {
  return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
}

function json(statusCode, body) {
  return { statusCode, headers: cors(), body: JSON.stringify(body) };
}

function requireAdmin(event) {
  if (!ADMIN_API_KEY) return null;
  const key = event.headers?.['x-admin-key'] || event.headers?.['X-Admin-Key'] || (event.headers?.Authorization || '').replace(/^Bearer\s+/i, '');
  if (key !== ADMIN_API_KEY) return { statusCode: 403, headers: cors(), body: JSON.stringify({ error: 'Forbidden' }) };
  return null;
}

function parsePath(event) {
  const path = event.path || event.requestContext?.http?.path || '';
  const match = path.match(/\/orgs\/([^/]+)\/listings(?:\/([^/]+))?/);
  return { orgId: match?.[1] || null, listingId: match?.[2] || null };
}

exports.handler = async (event) => {
  const forbidden = requireAdmin(event);
  if (forbidden) return forbidden;

  const { orgId, listingId } = parsePath(event);
  if (!orgId) return json(400, { error: 'Missing orgId' });

  const method = (event.requestContext?.http?.method || event.httpMethod || event.requestContext?.httpMethod || 'GET').toUpperCase();

  if (method === 'GET' && !listingId) return listListings(orgId, event);
  if (method === 'GET' && listingId) return getListing(orgId, listingId);
  if (method === 'POST' && !listingId) return createListing(orgId, event);
  if (method === 'PUT' && listingId) return updateListing(orgId, listingId, event);
  if (method === 'DELETE' && listingId) return deleteListing(orgId, listingId);

  return json(405, { error: 'Method not allowed' });
};

async function listListings(orgId, event) {
  const qs = event.queryStringParameters || {};
  const limit = Math.min(parseInt(qs.limit || '50', 10), 100);
  const status = qs.status;

  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
    ExpressionAttributeValues: { ':pk': `ORG#${orgId}`, ':sk': 'LISTING#' },
    Limit: limit,
  };
  if (status && LISTING_STATUSES.includes(status)) {
    params.FilterExpression = '#s = :status';
    params.ExpressionAttributeNames = { '#s': 'status' };
    params.ExpressionAttributeValues[':status'] = status;
  }

  const result = await client.send(new Query(params));
  const listings = (result.Items || []).filter((i) => i.entityType === 'Listing').map(normalize);

  return json(200, { listings, nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : null });
}

async function getListing(orgId, listingId) {
  const { Item } = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `ORG#${orgId}`, sk: `LISTING#${listingId}` },
    })
  );
  if (!Item || Item.entityType !== 'Listing') return json(404, { error: 'Listing not found' });
  return json(200, normalize(Item));
}

async function createListing(orgId, event) {
  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const err = validateListingBody(body, true);
  if (err) return json(400, { error: err });

  const listingId = randomUUID();
  const now = new Date().toISOString();
  const status = LISTING_STATUSES.includes(body.status) ? body.status : 'draft';
  const listing = buildListingItem({ orgId, listingId, ...body, status, createdAt: now, updatedAt: now });
  listing.pk = `ORG#${orgId}`;
  listing.sk = `LISTING#${listingId}`;
  listing.entityType = 'Listing';

  await client.send(new PutCommand({ TableName: TABLE_NAME, Item: listing }));

  if (status === 'published') {
    const publicItem = { ...listing, pk: `ENTITY#LISTING#${listingId}`, sk: `LISTING#${listingId}` };
    publicItem.gsi1pk = 'PUBLIC#LISTINGS';
    publicItem.gsi1sk = `published#${listing.countryCode || 'AE'}#${now}`;
    await client.send(new PutCommand({ TableName: TABLE_NAME, Item: publicItem }));
  }

  return json(201, normalize(listing));
}

async function updateListing(orgId, listingId, event) {
  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const err = validateListingBody(body, false);
  if (err) return json(400, { error: err });

  const { Item } = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `ORG#${orgId}`, sk: `LISTING#${listingId}` },
    })
  );
  if (!Item || Item.entityType !== 'Listing') return json(404, { error: 'Listing not found' });

  const now = new Date().toISOString();
  const status = LISTING_STATUSES.includes(body.status) ? body.status : Item.status;
  const merged = { ...Item, ...body, listingId, orgId, status, updatedAt: now };
  const listing = buildListingItem(merged);
  listing.pk = `ORG#${orgId}`;
  listing.sk = `LISTING#${listingId}`;
  listing.entityType = 'Listing';
  listing.createdAt = Item.createdAt;
  if (status === 'published' && !Item.publishedAt) listing.publishedAt = now;
  else if (Item.publishedAt) listing.publishedAt = Item.publishedAt;
  if (status === 'leased' || status === 'sold') listing.closedAt = body.closedAt || now;

  await client.send(new PutCommand({ TableName: TABLE_NAME, Item: listing }));

  if (status === 'published') {
    listing.gsi1pk = 'PUBLIC#LISTINGS';
    listing.gsi1sk = `published#${listing.countryCode || 'AE'}#${listing.createdAt}`;
    const publicItem = { ...listing, pk: `ENTITY#LISTING#${listingId}`, sk: `LISTING#${listingId}` };
    await client.send(new PutCommand({ TableName: TABLE_NAME, Item: publicItem }));
  } else {
    await client.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk: `ENTITY#LISTING#${listingId}`, sk: `LISTING#${listingId}` },
      })
    );
  }

  return json(200, normalize(listing));
}

async function deleteListing(orgId, listingId) {
  const { Item } = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `ORG#${orgId}`, sk: `LISTING#${listingId}` },
    })
  );
  if (!Item) return json(404, { error: 'Listing not found' });

  await client.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { pk: `ORG#${orgId}`, sk: `LISTING#${listingId}` },
    })
  );
  await client.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { pk: `ENTITY#LISTING#${listingId}`, sk: `LISTING#${listingId}` },
    })
  );
  return json(200, { message: 'Deleted' });
}

function validateListingBody(body, isCreate) {
  if (isCreate) {
    if (!body.title || typeof body.title !== 'string') return 'title is required';
    if (body.price == null || typeof body.price !== 'number') return 'price (number) is required';
    if (!body.currency || typeof body.currency !== 'string') return 'currency is required';
    if (!body.countryCode || !SUPPORTED_COUNTRIES.includes(body.countryCode)) return 'countryCode must be one of: ' + SUPPORTED_COUNTRIES.join(', ');
  }
  if (body.status && !LISTING_STATUSES.includes(body.status)) return 'status must be one of: ' + LISTING_STATUSES.join(', ');
  if (body.type && !LISTING_TYPES.includes(body.type)) return 'type must be rent or sale';
  if (body.mediaKeys != null && !Array.isArray(body.mediaKeys)) return 'mediaKeys must be an array';
  return null;
}

function buildListingItem(o) {
  return {
    listingId: o.listingId,
    orgId: o.orgId,
    status: o.status || 'draft',
    type: LISTING_TYPES.includes(o.type) ? o.type : 'rent',
    title: String(o.title || ''),
    description: o.description != null ? String(o.description) : undefined,
    price: Number(o.price),
    currency: String(o.currency || 'AED'),
    countryCode: SUPPORTED_COUNTRIES.includes(o.countryCode) ? o.countryCode : 'AE',
    region: o.region || undefined,
    city: o.city || undefined,
    area: o.area || undefined,
    address: o.address || undefined,
    lat: o.lat != null ? Number(o.lat) : undefined,
    lng: o.lng != null ? Number(o.lng) : undefined,
    bedrooms: o.bedrooms != null ? Number(o.bedrooms) : undefined,
    bathrooms: o.bathrooms != null ? Number(o.bathrooms) : undefined,
    areaSqm: o.areaSqm != null ? Number(o.areaSqm) : undefined,
    mediaKeys: Array.isArray(o.mediaKeys) ? o.mediaKeys : [],
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    publishedAt: o.publishedAt || undefined,
    closedAt: o.closedAt || undefined,
  };
}

function normalize(item) {
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
    address: item.address,
    lat: item.lat,
    lng: item.lng,
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    areaSqm: item.areaSqm,
    mediaKeys: item.mediaKeys || [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    publishedAt: item.publishedAt,
    closedAt: item.closedAt,
  };
}
