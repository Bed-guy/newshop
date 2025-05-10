/**
 * 获取请求的真实IP地址
 * 
 * 这个函数会尝试从各种HTTP头部获取客户端的真实IP地址
 * 优先级顺序：
 * 1. X-Forwarded-For
 * 2. X-Real-IP
 * 3. CF-Connecting-IP (Cloudflare)
 * 4. True-Client-IP
 * 5. X-Client-IP
 * 6. req.connection.remoteAddress
 * 
 * @param {Object} req - Express请求对象
 * @returns {String} 客户端的IP地址
 */
function getRealIp(req) {
  // 尝试从X-Forwarded-For获取
  const forwardedIpsStr = req.headers['x-forwarded-for'];
  if (forwardedIpsStr) {
    // X-Forwarded-For可能包含多个IP，第一个是客户端的真实IP
    const forwardedIps = forwardedIpsStr.split(',').map(ip => ip.trim());
    if (forwardedIps.length > 0 && forwardedIps[0]) {
      return forwardedIps[0];
    }
  }

  // 尝试从其他常见头部获取
  if (req.headers['x-real-ip']) {
    return req.headers['x-real-ip'];
  }

  if (req.headers['cf-connecting-ip']) {
    return req.headers['cf-connecting-ip'];
  }

  if (req.headers['true-client-ip']) {
    return req.headers['true-client-ip'];
  }

  if (req.headers['x-client-ip']) {
    return req.headers['x-client-ip'];
  }

  // 如果所有头部都没有，使用socket的远程地址
  const remoteAddress = req.connection?.remoteAddress || 
                        req.socket?.remoteAddress || 
                        req.connection?.socket?.remoteAddress || 
                        req.ip;

  // 处理IPv4映射的IPv6地址 (::ffff:127.0.0.1)
  if (remoteAddress && remoteAddress.startsWith('::ffff:')) {
    return remoteAddress.substring(7);
  }

  return remoteAddress || '0.0.0.0';
}

module.exports = {
  getRealIp
};
