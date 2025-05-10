const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initDatabase, testConnection } = require('./db');
const logger = require('./logger');
require('dotenv').config();

// 导入路由
const userLogsRouter = require('./routes/userLogs');
const productLogsRouter = require('./routes/productLogs');
const purchaseLogsRouter = require('./routes/purchaseLogs');
const adminLogsRouter = require('./routes/adminLogs');
const analyticsRouter = require('./routes/analytics');

// 导入新增的路由
const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const cartRouter = require('./routes/cart'); // 旧的购物车路由
const shoppingCartRouter = require('./routes/shoppingCart'); // 新的购物车路由
const ordersRouter = require('./routes/orders');
const favoritesRouter = require('./routes/favorites');
const adminRouter = require('./routes/admin'); // 管理员路由
const recommendationsRouter = require('./routes/recommendations').router; // 商品推荐路由
const compatRouter = require('./routes/compat');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 8000;

// 中间件
app.use(cors({
  origin: '*', // 允许所有来源
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'User-Id', 'Session-Id', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  maxAge: 86400 // 预检请求的有效期，单位为秒
}));

// 启用OPTIONS预检请求处理
app.options('*', cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// 添加CORS头部到所有响应
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, User-Id, Session-Id, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// 数据收集路由
app.use('/api/logs/users', userLogsRouter);
app.use('/api/logs/products', productLogsRouter);
app.use('/api/logs/purchases', purchaseLogsRouter);
app.use('/api/logs/admins', adminLogsRouter);
app.use('/api/analytics', analyticsRouter);

// 主要API路由
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/cart', cartRouter); // 保留旧的购物车路由，以便兼容
app.use('/api/shopping-cart', shoppingCartRouter); // 新的购物车路由
app.use('/api/orders', ordersRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/admin', adminRouter); // 管理员路由
app.use('/api/recommendations', recommendationsRouter); // 商品推荐路由

// 兼容路由 - 支持旧的API路径格式
app.use('/myapp', compatRouter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error('服务器错误', { error: err.message, stack: err.stack });
  res.status(500).json({ error: '服务器内部错误' });
});



// 初始化数据库并启动服务器
async function startServer() {
  try {
    console.log('开始启动服务器...');

    // 测试数据库连接
    console.log('测试数据库连接...');
    const connected = await testConnection();
    console.log('数据库连接测试结果:', connected);

    if (!connected) {
      throw new Error('无法连接到数据库');
    }

    // 初始化数据库
    console.log('初始化数据库...');
    await initDatabase();
    console.log('数据库初始化完成');

    // 启动服务器
    console.log('启动HTTP服务器...');
    app.listen(PORT, () => {
      console.log(`服务器已启动，监听端口: ${PORT}`);
      console.log(`API地址: http://localhost:${PORT}/api`);
      logger.info(`服务器已启动，监听端口: ${PORT}`);
      logger.info(`API地址: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error.message);
    console.error('错误堆栈:', error.stack);
    logger.error('服务器启动失败', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

startServer();
