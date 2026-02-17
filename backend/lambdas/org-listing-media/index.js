const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');
const path = require('path');

const s3 = new S3Client({});
const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 10;

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
  const p = event.path || event.requestContext?.http?.path || '';
  const m = p.match(/\/orgs\/([^/]+)\/listings\/([^/]+)\/media\/presign/);
  return { orgId: m?.[1] || null, listingId: m?.[2] || null };
}

exports.handler = async (event) => {
  const forbidden = requireAdmin(event);
  if (forbidden) return forbidden;

  const { orgId, listingId } = parsePath(event);
  if (!orgId || !listingId) return json(400, { error: 'Missing orgId or listingId' });

  const method = (event.requestContext?.http?.method || event.httpMethod || 'POST').toUpperCase();
  if (method !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const fileName = (body.fileName || body.filename || '').trim() || 'image.jpg';
  const contentType = (body.contentType || body.content_type || 'image/jpeg').toLowerCase();
  if (!ALLOWED_TYPES.includes(contentType)) {
    return json(400, { error: 'contentType must be one of: ' + ALLOWED_TYPES.join(', ') });
  }

  const ext = path.extname(fileName).slice(1) || (contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1] || 'jpg');
  const key = `${orgId}/${listingId}/${randomUUID()}.${ext.replace(/jpeg/, 'jpg')}`;

  const { Item } = await doc.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `ORG#${orgId}`, sk: `LISTING#${listingId}` },
    })
  );
  if (!Item || Item.entityType !== 'Listing') return json(404, { error: 'Listing not found' });

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

  return json(200, {
    uploadUrl,
    key,
    expiresIn: 900,
    message: 'Upload with PUT to uploadUrl, then add key to listing mediaKeys via PUT /orgs/{orgId}/listings/{listingId}',
  });
};
