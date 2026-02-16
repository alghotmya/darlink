exports.handler = async (event) => {
  const auth = event.requestContext?.authorizer ?? event.headers?.Authorization;
  // MVP: no Cognito authorizer wired yet; return placeholder until auth is enabled
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      userId: null,
      email: null,
      orgIds: [],
      roles: {},
      message: 'Auth not configured yet. Configure Cognito authorizer and decode JWT for /me',
    }),
  };
};
