const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    ['/reportingApi', '/leasing_reports'],
    createProxyMiddleware({
      target: 'https://elise-data-transf.s3.amazonaws.com',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/reportingApi': '/leasing_reports'
      }
    })
  );
};