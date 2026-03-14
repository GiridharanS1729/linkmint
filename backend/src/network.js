export function getRequestIp(request) {
  const xff = request.headers['x-forwarded-for'];
  if (xff) {
    const first = String(xff).split(',')[0]?.trim();
    if (first) return first;
  }
  return request.ip || '0.0.0.0';
}
