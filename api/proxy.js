const { createProxyMiddleware } = require("http-proxy-middleware");

// 从环境变量中读取密码和安全路径
const PASSWORD = process.env.NEXT_PUBLIC_SAFEPWD;
const SAFE_PATH = process.env.NEXT_PUBLIC_SAFEPATH || '/safepath';

module.exports = (req, res) => {
  // 检查请求路径是否以安全路径开头
  if (req.url.startsWith(SAFE_PATH)) {
    // 提取目标URL（去掉安全路径前缀）
    let targetUrl = req.url.slice(SAFE_PATH.length);
    
    // 移除开头的斜杠（如果有）
    if (targetUrl.startsWith('/')) {
      targetUrl = targetUrl.slice(1);
    }
    
    // 解码URL编码的字符（如%2F -> /）
    targetUrl = decodeURIComponent(targetUrl);
    
    // 检查是否包含协议头，如果没有则添加https://
    if (!targetUrl.includes('://')) {
      targetUrl = 'https://' + targetUrl;
    }
    
    // 验证目标URL格式
    try {
      new URL(targetUrl); // 如果能成功创建URL对象，说明格式正确
      
      // 执行代理逻辑，直接转发到目标URL
      createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        pathRewrite: (path) => {
          // 完全重写路径，只保留目标URL后面的部分
          const urlObj = new URL(targetUrl);
          return path.replace(new RegExp(`^${SAFE_PATH}/${urlObj.protocol}//${urlObj.host}`), '');
        },
        router: () => targetUrl, // 动态设置目标URL
        onProxyReq: (proxyReq) => {
          // 移除可能存在的host头，避免被目标服务器拒绝
          proxyReq.removeHeader('host');
        },
      })(req, res);
      return;
    } catch (e) {
      res.status(400).send('Invalid target URL format');
      return;
    }
  }

  // 如果不是安全路径请求，继续原有的密码验证逻辑
  const safepwd = req.cookies.safepwd;
  if (safepwd === PASSWORD) {
    // 如果密码正确，移除 safepwd cookie 后再转发请求
    if (req.headers.cookie) {
      req.headers.cookie = req.headers.cookie
        .split(';')
        .map(cookie => cookie.trim())
        .filter(cookie => !cookie.startsWith('safepwd='))
        .join(';');
    }

    // 执行代理逻辑
    let target = process.env.NEXT_PUBLIC_ACCESSURL;
    
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: {},
    })(req, res);
  } else {
    // 原有的密码验证界面代码保持不变
    // ...
  }
};
