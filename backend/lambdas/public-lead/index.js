const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

const MAX_MESSAGE_LENGTH = 2000;
const MAX_NAME_LENGTH = 200;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = async (event) => {
  const path = event.path || event.requestContext?.http?.path || '';
  const idMatch = path.match(/\/public\/listings\/([^/]+)\/leads/);
  const listingId = idMatch ? idMatch[1] : null;

  if (!listingId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing listing id' }) };
  }

  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const name = sanitize(body.name, MAX_NAME_LENGTH);
  const email = (body.email || '').trim().toLowerCase();
  const phone = sanitize(body.phone, 50);
  const message = sanitize(body.message, MAX_MESSAGE_LENGTH);

  if (!name || !email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'name and email are required' }),
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    };
  }
  if (!EMAIL_REGEX.test(email)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid email' }),
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    };
  }

  const { Item: listing } = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `ENTITY#LISTING#${listingId}`, sk: `LISTING#${listingId}` },
    })
  );
  if (!listing || listing.status !== 'published') {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Listing not found or not published' }),
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    };
  }

  const orgId = listing.orgId;
  const leadId = randomUUID();
  const now = new Date().toISOString();

  await client.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `ORG#${orgId}`,
        sk: `LEAD#${leadId}`,
        leadId,
        listingId,
        orgId,
        name,
        email,
        phone: phone || undefined,
        message: message || undefined,
        status: 'new',
        createdAt: now,
        updatedAt: now,
        entityType: 'Lead',
      },
    })
  );

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ leadId, message: 'Lead submitted successfully' }),
  };
};

function sanitize(str, maxLen) {
  if (str == null) return '';
  return String(str).trim().slice(0, maxLen);
}
