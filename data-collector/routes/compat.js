const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { generateToken, authenticateToken } = require('../utils/auth');
const logger = require('../logger');

// 用户相关兼容路由
// 用户登录
router.post('/user/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码为必填项' });
    }

    // 查找用户
    const users = await query('SELECT * FROM user_auth_simpleuser WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }

    const user = users[0];

    // 验证密码
    if (user.password !== password) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }

    // 生成令牌
    const token = generateToken(user);

    // 更新或创建令牌记录
    const existingToken = await query('SELECT * FROM authtoken_token WHERE user_id = ?', [user.id]);
    if (existingToken.length > 0) {
      await query('UPDATE authtoken_token SET `key` = ?, created = NOW() WHERE user_id = ?', [token, user.id]);
    } else {
      await query('INSERT INTO authtoken_token (`key`, created, user_id) VALUES (?, NOW(), ?)', [token, user.id]);
    }

    // 记录用户登录日志
    const { getRealIp } = require('../utils/ip');
    const ip = getRealIp(req);
    await query(
      'INSERT INTO user_login_logs (user_id, action, ip_address, timestamp, user_agent) VALUES (?, ?, ?, NOW(), ?)',
      [user.id, 'login', ip, req.get('User-Agent')]
    );

    logger.info(`用户登录成功: ${username}`);

    res.json({
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_active: user.is_active,
        date_joined: user.date_joined
      }
    });
  } catch (error) {
    logger.error('用户登录失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 用户注册
router.post('/user/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码为必填项' });
    }

    // 检查用户名是否已存在
    const existingUser = await query('SELECT * FROM user_auth_simpleuser WHERE username = ?', [username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 创建新用户
    const result = await query(
      `INSERT INTO user_auth_simpleuser
       (username, password, email, is_active, date_joined, is_staff, is_superuser)
       VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
      [username, password, email || '', 1, '0', '0']
    );

    // 获取新创建的用户
    const newUser = await query('SELECT * FROM user_auth_simpleuser WHERE id = ?', [result.insertId]);

    // 生成令牌
    const token = generateToken(newUser[0]);

    // 创建令牌记录
    await query(
      `INSERT INTO authtoken_token (\`key\`, created, user_id) VALUES (?, NOW(), ?)`,
      [token, newUser[0].id]
    );

    // 记录用户注册日志
    logger.info(`用户注册成功: ${username}`);

    res.status(201).json({
      token: token,
      user: {
        id: newUser[0].id,
        username: newUser[0].username,
        email: newUser[0].email,
        is_active: newUser[0].is_active,
        date_joined: newUser[0].date_joined
      }
    });
  } catch (error) {
    logger.error('用户注册失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 用户信息
router.get('/user/info', async (req, res) => {
  try {
    const userId = req.query.id || req.headers['user-id'];

    if (!userId) {
      return res.status(400).json({ message: '需要用户ID' });
    }

    const users = await query('SELECT * FROM user_auth_simpleuser WHERE id = ?', [userId]);

    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const user = users[0];

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      is_active: user.is_active,
      date_joined: user.date_joined
    });
  } catch (error) {
    logger.error('获取用户信息失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 商品相关兼容路由
// 商品列表
router.get('/thing/list', async (req, res) => {
  try {
    const { category, search, ordering } = req.query;

    let sql = `
      SELECT p.*, c.name as category_name
      FROM products_product p
      LEFT JOIN categories_category c ON p.category_id = c.id
      WHERE 1=1
    `;

    const params = [];

    // 分类过滤
    if (category) {
      sql += ' AND p.category_id = ?';
      params.push(category);
    }

    // 搜索过滤
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // 排序
    if (ordering) {
      const orderField = ordering.startsWith('-') ? ordering.substring(1) : ordering;
      const orderDirection = ordering.startsWith('-') ? 'DESC' : 'ASC';

      // 验证排序字段
      const validFields = ['price', 'created_at', 'stock'];
      if (validFields.includes(orderField)) {
        sql += ` ORDER BY p.${orderField} ${orderDirection}`;
      }
    } else {
      sql += ' ORDER BY p.created_at DESC';
    }

    const products = await query(sql, params);

    // 转换为前端期望的格式
    const formattedProducts = products.map(product => ({
      id: product.id,
      title: product.name,
      price: product.price,
      stock: product.stock,
      description: product.description,
      image_url: product.image_url,
      category_id: product.category_id,
      category_name: product.category_name,
      created_at: product.created_at
    }));

    res.json(formattedProducts);
  } catch (error) {
    logger.error('获取商品列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 商品详情
router.get('/thing/detail', async (req, res) => {
  try {
    const productId = req.query.id;

    if (!productId) {
      return res.status(400).json({ message: '需要商品ID' });
    }

    const products = await query(
      `SELECT p.*, c.name as category_name
       FROM products_product p
       LEFT JOIN categories_category c ON p.category_id = c.id
       WHERE p.id = ?`,
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({ message: '商品不存在' });
    }

    const product = products[0];

    // 记录商品浏览
    const { getRealIp } = require('../utils/ip');
    const ip = getRealIp(req);
    const sessionId = req.headers['session-id'] || 'unknown';
    const userId = req.headers['user-id'] || null;

    await query(
      `INSERT INTO product_view_logs
       (user_id, session_id, product_id, category_id, view_time, ip_address)
       VALUES (?, ?, ?, ?, NOW(), ?)`,
      [userId, sessionId, productId, product.category_id, ip]
    );

    // 转换为前端期望的格式
    const formattedProduct = {
      id: product.id,
      title: product.name,
      price: product.price,
      stock: product.stock,
      description: product.description,
      image_url: product.image_url,
      category_id: product.category_id,
      category_name: product.category_name,
      created_at: product.created_at
    };

    res.json(formattedProduct);
  } catch (error) {
    logger.error('获取商品详情失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 订单相关兼容路由
// 创建订单
router.post('/order/create', async (req, res) => {
  try {
    const { recipient_name, recipient_phone, shipping_address, product_id, quantity } = req.body;
    const userId = req.headers['user-id'];

    // 验证必填字段
    if (!recipient_name || !recipient_phone || !shipping_address || !product_id || !quantity) {
      return res.status(400).json({ message: '收件人姓名、电话、地址、商品ID和数量为必填项' });
    }

    if (!userId) {
      return res.status(400).json({ message: '需要用户ID' });
    }

    // 获取商品信息
    const products = await query('SELECT * FROM products_product WHERE id = ?', [product_id]);

    if (products.length === 0) {
      return res.status(404).json({ message: '商品不存在' });
    }

    const product = products[0];

    // 验证库存是否充足
    if (product.stock < quantity) {
      return res.status(400).json({ message: '商品库存不足' });
    }

    // 计算总价
    const totalAmount = product.price * quantity;

    // 创建订单
    const orderResult = await query(
      `INSERT INTO orders_order
       (user_id, recipient_name, recipient_phone, shipping_address,
        total_amount, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [userId, recipient_name, recipient_phone, shipping_address, totalAmount]
    );

    const orderId = orderResult.insertId;

    // 创建订单项
    await query(
      `INSERT INTO orders_orderitem
       (order_id, product_id, quantity, price)
       VALUES (?, ?, ?, ?)`,
      [orderId, product_id, quantity, product.price]
    );

    // 更新商品库存
    await query(
      'UPDATE products_product SET stock = stock - ? WHERE id = ?',
      [quantity, product_id]
    );

    // 记录购买日志
    await query(
      `INSERT INTO purchase_logs
       (user_id, product_id, category_id, purchase_date, unit_price, quantity, total_price, order_id)
       VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)`,
      [
        userId,
        product_id,
        product.category_id,
        product.price,
        quantity,
        totalAmount,
        orderId
      ]
    );

    // 获取创建的订单
    const orders = await query(
      'SELECT * FROM orders_order WHERE id = ?',
      [orderId]
    );

    const orderItems = await query(
      `SELECT oi.*, p.name as product_name, p.image_url
       FROM orders_orderitem oi
       JOIN products_product p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    logger.info(`订单创建成功: ID=${orderId}, 总金额=${totalAmount}`);

    res.status(201).json({
      ...orders[0],
      items: orderItems
    });
  } catch (error) {
    logger.error('创建订单失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 订单列表
router.get('/order/list', async (req, res) => {
  try {
    const userId = req.headers['user-id'] || req.query.user_id;

    if (!userId) {
      return res.status(400).json({ message: '需要用户ID' });
    }

    const orders = await query(
      'SELECT * FROM orders_order WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    // 获取每个订单的商品
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await query(
        `SELECT oi.*, p.name as product_name, p.image_url
         FROM orders_orderitem oi
         JOIN products_product p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );

      return {
        ...order,
        items
      };
    }));

    res.json(ordersWithItems);
  } catch (error) {
    logger.error('获取订单列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 添加收藏相关路由

// 获取收藏的商品列表
router.get('/thing/getWishThingList', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 查询用户收藏的商品
    const wishItems = await query(
      `SELECT p.*, c.name as category_name
       FROM products_product p
       LEFT JOIN categories_category c ON p.category_id = c.id
       INNER JOIN user_wish_list w ON p.id = w.product_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [userId]
    );

    // 格式化响应
    const formattedItems = wishItems.map(item => ({
      id: item.id,
      title: item.name,
      price: parseFloat(item.price),
      stock: item.stock,
      description: item.description,
      image_url: item.image_url,
      category_id: item.category_id,
      category_name: item.category_name,
      created_at: item.created_at
    }));

    res.json(formattedItems);
  } catch (error) {
    logger.error('获取收藏列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 添加商品到收藏
router.post('/thing/addWishUser', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.query.id || req.body.id;

    if (!productId) {
      return res.status(400).json({ message: '缺少商品ID' });
    }

    // 检查商品是否存在
    const products = await query('SELECT * FROM products_product WHERE id = ?', [productId]);
    if (products.length === 0) {
      return res.status(404).json({ message: '商品不存在' });
    }

    // 检查是否已经收藏
    const existingWish = await query(
      'SELECT * FROM user_wish_list WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (existingWish.length > 0) {
      return res.status(400).json({ message: '已经收藏过该商品' });
    }

    // 添加到收藏
    await query(
      'INSERT INTO user_wish_list (user_id, product_id, created_at) VALUES (?, ?, NOW())',
      [userId, productId]
    );

    res.status(201).json({ message: '添加收藏成功' });
  } catch (error) {
    logger.error('添加收藏失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 从收藏中移除商品
router.post('/thing/removeWishUser', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.query.id || req.body.id;

    if (!productId) {
      return res.status(400).json({ message: '缺少商品ID' });
    }

    // 从收藏中移除
    await query(
      'DELETE FROM user_wish_list WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    res.json({ message: '移除收藏成功' });
  } catch (error) {
    logger.error('移除收藏失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取收藏夹中的商品列表
router.get('/thing/getCollectThingList', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 查询用户收藏夹中的商品
    const collectItems = await query(
      `SELECT p.*, c.name as category_name
       FROM products_product p
       LEFT JOIN categories_category c ON p.category_id = c.id
       INNER JOIN user_collection w ON p.id = w.product_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [userId]
    );

    // 格式化响应
    const formattedItems = collectItems.map(item => ({
      id: item.id,
      title: item.name,
      price: parseFloat(item.price),
      stock: item.stock,
      description: item.description,
      image_url: item.image_url,
      category_id: item.category_id,
      category_name: item.category_name,
      created_at: item.created_at
    }));

    res.json(formattedItems);
  } catch (error) {
    logger.error('获取收藏夹列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 添加商品到收藏夹
router.post('/thing/addCollectUser', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.query.id || req.body.id;

    if (!productId) {
      return res.status(400).json({ message: '缺少商品ID' });
    }

    // 检查商品是否存在
    const products = await query('SELECT * FROM products_product WHERE id = ?', [productId]);
    if (products.length === 0) {
      return res.status(404).json({ message: '商品不存在' });
    }

    // 检查是否已经在收藏夹中
    const existingCollect = await query(
      'SELECT * FROM user_collection WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (existingCollect.length > 0) {
      return res.status(400).json({ message: '已经添加到收藏夹' });
    }

    // 添加到收藏夹
    await query(
      'INSERT INTO user_collection (user_id, product_id, created_at) VALUES (?, ?, NOW())',
      [userId, productId]
    );

    res.status(201).json({ message: '添加到收藏夹成功' });
  } catch (error) {
    logger.error('添加到收藏夹失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 从收藏夹中移除商品
router.post('/thing/removeCollectUser', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.query.id || req.body.id;

    if (!productId) {
      return res.status(400).json({ message: '缺少商品ID' });
    }

    // 从收藏夹中移除
    await query(
      'DELETE FROM user_collection WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    res.json({ message: '从收藏夹移除成功' });
  } catch (error) {
    logger.error('从收藏夹移除失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 购物车相关兼容路由
// 获取购物车
router.get('/cart/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 获取购物车商品
    const cartItems = await query(
      `SELECT sc.id, sc.product_id, sc.quantity, sc.created_at, sc.updated_at,
              p.name, p.price, p.image_url, p.stock, c.name as category_name
       FROM shopping_cart sc
       JOIN products_product p ON sc.product_id = p.id
       LEFT JOIN categories_category c ON p.category_id = c.id
       WHERE sc.user_id = ?
       ORDER BY sc.created_at DESC`,
      [userId]
    );

    // 计算总价
    const totalPrice = cartItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);

    res.json({
      items: cartItems.map(item => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        name: item.name,
        price: parseFloat(item.price),
        image_url: item.image_url,
        stock: item.stock,
        category_name: item.category_name,
        total_item_price: parseFloat(item.price) * item.quantity
      })),
      total_price: totalPrice.toFixed(2)
    });
  } catch (error) {
    logger.error('获取购物车失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 添加商品到购物车
router.post('/cart/add', authenticateToken, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    const userId = req.user.id;

    // 验证必填字段
    if (!product_id) {
      return res.status(400).json({ message: '商品ID为必填项' });
    }

    // 验证商品是否存在
    const products = await query(
      'SELECT * FROM products_product WHERE id = ?',
      [product_id]
    );

    if (products.length === 0) {
      return res.status(404).json({ message: '商品不存在' });
    }

    const product = products[0];

    // 验证库存是否充足
    if (product.stock < quantity) {
      return res.status(400).json({ message: '商品库存不足' });
    }

    // 检查购物车中是否已有该商品
    const existingItems = await query(
      'SELECT * FROM shopping_cart WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    );

    if (existingItems.length > 0) {
      // 更新数量
      const newQuantity = existingItems[0].quantity + parseInt(quantity);

      // 再次验证库存是否充足
      if (product.stock < newQuantity) {
        return res.status(400).json({ message: '商品库存不足' });
      }

      await query(
        'UPDATE shopping_cart SET quantity = ?, updated_at = NOW() WHERE id = ?',
        [newQuantity, existingItems[0].id]
      );

      // 获取更新后的购物车商品
      const updatedItem = await query(
        `SELECT sc.*, p.name, p.price, p.image_url, p.stock
         FROM shopping_cart sc
         JOIN products_product p ON sc.product_id = p.id
         WHERE sc.id = ?`,
        [existingItems[0].id]
      );

      res.json({
        id: updatedItem[0].id,
        product_id: updatedItem[0].product_id,
        quantity: updatedItem[0].quantity,
        name: updatedItem[0].name,
        price: parseFloat(updatedItem[0].price),
        image_url: updatedItem[0].image_url,
        stock: updatedItem[0].stock,
        total_item_price: parseFloat(updatedItem[0].price) * updatedItem[0].quantity
      });
    } else {
      // 添加新商品
      const result = await query(
        'INSERT INTO shopping_cart (user_id, product_id, quantity, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [userId, product_id, quantity]
      );

      // 获取新添加的购物车商品
      const newItem = await query(
        `SELECT sc.*, p.name, p.price, p.image_url, p.stock
         FROM shopping_cart sc
         JOIN products_product p ON sc.product_id = p.id
         WHERE sc.id = ?`,
        [result.insertId]
      );

      res.status(201).json({
        id: newItem[0].id,
        product_id: newItem[0].product_id,
        quantity: newItem[0].quantity,
        name: newItem[0].name,
        price: parseFloat(newItem[0].price),
        image_url: newItem[0].image_url,
        stock: newItem[0].stock,
        total_item_price: parseFloat(newItem[0].price) * newItem[0].quantity
      });
    }
  } catch (error) {
    logger.error('添加商品到购物车失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 支付订单
router.post('/order/pay/:id', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { payment_method } = req.body;
    const userId = req.user.id;

    // 验证必填字段
    if (!payment_method) {
      return res.status(400).json({ message: '支付方式为必填项' });
    }

    // 验证支付方式
    const validPaymentMethods = ['alipay', 'wechat', 'credit_card', 'cash'];
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({ message: '无效的支付方式' });
    }

    // 验证订单是否存在
    const orders = await query(
      'SELECT * FROM orders_order WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: '订单不存在' });
    }

    const order = orders[0];

    // 验证订单是否属于当前用户
    if (order.user_id !== userId && !req.user.is_staff && !req.user.is_superuser) {
      return res.status(403).json({ message: '无权访问此订单' });
    }

    // 验证订单状态是否为待支付
    if (order.status !== 'pending') {
      return res.status(400).json({ message: `订单状态为 ${order.status}，无法支付` });
    }

    // 更新订单状态为已支付
    await query(
      'UPDATE orders_order SET status = ?, payment_method = ?, payment_time = NOW(), updated_at = NOW() WHERE id = ?',
      ['paid', payment_method, orderId]
    );

    // 记录支付日志
    const { getRealIp } = require('../utils/ip');
    const ip = getRealIp(req);
    await query(
      `INSERT INTO payment_logs
       (user_id, order_id, amount, payment_method, status, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId, orderId, order.total_amount, payment_method, 'success', ip]
    );

    logger.info(`订单支付成功: ID=${orderId}, 支付方式=${payment_method}, 金额=${order.total_amount}`);

    // 获取更新后的订单
    const updatedOrders = await query(
      'SELECT * FROM orders_order WHERE id = ?',
      [orderId]
    );

    const items = await query(
      `SELECT oi.*, p.name as product_name, p.image_url
       FROM orders_orderitem oi
       JOIN products_product p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    res.json({
      ...updatedOrders[0],
      items
    });
  } catch (error) {
    logger.error('支付订单失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 管理员登录
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码为必填项' });
    }

    // 查找用户
    const users = await query('SELECT * FROM user_auth_simpleuser WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }

    const user = users[0];

    // 验证密码
    if (user.password !== password) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }

    // 验证是否是管理员
    const isAdmin = user.is_staff === 1 || user.is_staff === '1' || user.is_superuser === 1 || user.is_superuser === '1';

    // 生成令牌
    const token = generateToken(user);

    // 更新或创建令牌记录
    const existingToken = await query('SELECT * FROM authtoken_token WHERE user_id = ?', [user.id]);
    if (existingToken.length > 0) {
      await query('UPDATE authtoken_token SET `key` = ?, created = NOW() WHERE user_id = ?', [token, user.id]);
    } else {
      await query('INSERT INTO authtoken_token (`key`, created, user_id) VALUES (?, NOW(), ?)', [token, user.id]);
    }

    // 记录用户登录日志
    const { getRealIp } = require('../utils/ip');
    const ip = getRealIp(req);
    await query(
      'INSERT INTO user_login_logs (user_id, action, ip_address, timestamp, user_agent) VALUES (?, ?, ?, NOW(), ?)',
      [user.id, 'login', ip, req.get('User-Agent')]
    );

    logger.info(`用户登录成功: ${username}`);

    res.json({
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_active: user.is_active,
        is_staff: isAdmin,
        is_superuser: user.is_superuser === 1 || user.is_superuser === '1',
        date_joined: user.date_joined
      }
    });
  } catch (error) {
    logger.error('用户登录失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 订单列表API
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    // 检查是否是管理员请求所有订单
    const isAdminRequest = req.user.is_staff || req.user.is_superuser;

    // 如果不是管理员，但请求包含user_id参数，并且不是自己的ID，则拒绝访问
    if (!isAdminRequest && req.query.user_id && parseInt(req.query.user_id) !== req.user.id) {
      return res.status(403).json({ message: '无权访问其他用户的订单' });
    }

    // 如果不是管理员，强制使用自己的用户ID
    if (!isAdminRequest) {
      req.query.user_id = req.user.id;
    }

    const { status, limit = 50, offset = 0 } = req.query;

    let sql = 'SELECT * FROM orders_order WHERE 1=1';
    const params = [];

    // 用户ID过滤（如果不是管理员请求）
    if (!isAdminRequest || req.query.user_id) {
      sql += ' AND user_id = ?';
      params.push(req.query.user_id);
    }

    // 状态过滤
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    // 分页
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const orders = await query(sql, params);

    // 获取每个订单的商品
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await query(
        `SELECT oi.*, p.name as product_name, p.image_url
         FROM orders_orderitem oi
         JOIN products_product p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );

      return {
        ...order,
        items
      };
    }));

    // 如果是管理员，记录管理员操作
    if (isAdminRequest) {
      const { getRealIp } = require('../utils/ip');
      const ip = getRealIp(req);
      await query(
        `INSERT INTO admin_operation_logs
         (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [req.user.id, 'query', '查询订单列表', 'order', ip]
      );
    }

    res.json(ordersWithItems);
  } catch (error) {
    logger.error('获取所有订单失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 用户列表API
router.get('/auth/users', authenticateToken, async (req, res) => {
  try {
    const { page = 1, page_size = 10, username, email, is_staff, is_active } = req.query;
    const offset = (page - 1) * page_size;

    let sql = 'SELECT id, username, email, first_name, last_name, is_staff, is_superuser, is_active, date_joined, last_login FROM user_auth_simpleuser WHERE 1=1';
    const params = [];

    // 用户名过滤
    if (username) {
      sql += ' AND username LIKE ?';
      params.push(`%${username}%`);
    }

    // 邮箱过滤
    if (email) {
      sql += ' AND email LIKE ?';
      params.push(`%${email}%`);
    }

    // 是否是员工过滤
    if (is_staff !== undefined) {
      sql += ' AND is_staff = ?';
      params.push(is_staff === 'true' || is_staff === '1' ? 1 : 0);
    }

    // 是否激活过滤
    if (is_active !== undefined) {
      sql += ' AND is_active = ?';
      params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
    }

    // 添加排序和分页
    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(page_size), parseInt(offset));

    const users = await query(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM user_auth_simpleuser WHERE 1=1';
    const countParams = [];

    if (username) {
      countSql += ' AND username LIKE ?';
      countParams.push(`%${username}%`);
    }

    if (email) {
      countSql += ' AND email LIKE ?';
      countParams.push(`%${email}%`);
    }

    if (is_staff !== undefined) {
      countSql += ' AND is_staff = ?';
      countParams.push(is_staff === 'true' || is_staff === '1' ? 1 : 0);
    }

    if (is_active !== undefined) {
      countSql += ' AND is_active = ?';
      countParams.push(is_active === 'true' || is_active === '1' ? 1 : 0);
    }

    const totalResult = await query(countSql, countParams);
    const total = totalResult[0].total;

    res.json({
      count: total,
      next: page * page_size < total ? `${req.baseUrl}${req.path}?page=${parseInt(page) + 1}&page_size=${page_size}` : null,
      previous: page > 1 ? `${req.baseUrl}${req.path}?page=${parseInt(page) - 1}&page_size=${page_size}` : null,
      results: users
    });
  } catch (error) {
    logger.error('获取用户列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 管理员仪表盘数据（不需要认证，用于演示）
router.get('/admin/overview/count', async (req, res) => {
  try {
    // 获取用户总数
    const userCountResult = await query('SELECT COUNT(*) as count FROM user_auth_simpleuser');
    const userCount = userCountResult[0].count;

    // 获取订单总数
    const orderCountResult = await query('SELECT COUNT(*) as count FROM orders_order');
    const orderCount = orderCountResult[0].count;

    // 获取商品总数
    const productCountResult = await query('SELECT COUNT(*) as count FROM products_product');
    const productCount = productCountResult[0].count;

    // 获取分类总数
    const categoryCountResult = await query('SELECT COUNT(*) as count FROM categories_category');
    const categoryCount = categoryCountResult[0].count;

    // 获取总销售额
    const salesResult = await query('SELECT SUM(total_amount) as total FROM orders_order WHERE status != "cancelled"');
    const totalSales = salesResult[0].total || 0;

    // 获取今日订单数
    const todayOrdersResult = await query(
      'SELECT COUNT(*) as count FROM orders_order WHERE DATE(created_at) = CURDATE()'
    );
    const todayOrders = todayOrdersResult[0].count;

    // 获取今日销售额
    const todaySalesResult = await query(
      'SELECT SUM(total_amount) as total FROM orders_order WHERE DATE(created_at) = CURDATE() AND status != "cancelled"'
    );
    const todaySales = todaySalesResult[0].total || 0;

    // 获取订单状态统计
    const orderStatusResult = await query(
      'SELECT status, COUNT(*) as count FROM orders_order GROUP BY status'
    );

    // 获取最近7天的订单数据
    const last7DaysOrdersResult = await query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total_amount) as sales_amount
       FROM orders_order
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date`
    );

    // 获取最近的订单
    const recentOrdersResult = await query(
      `SELECT o.*, u.username
       FROM orders_order o
       JOIN user_auth_simpleuser u ON o.user_id = u.id
       ORDER BY o.created_at DESC
       LIMIT 5`
    );

    // 获取最近的用户
    const recentUsersResult = await query(
      'SELECT id, username, email, date_joined FROM user_auth_simpleuser ORDER BY date_joined DESC LIMIT 5'
    );

    // 为旧的仪表盘组件添加兼容数据
    const thingCount = productCount;
    const thingWeekCount = await query(
      'SELECT COUNT(*) as count FROM products_product WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
    );

    // 获取未付订单数
    const orderNotPayCount = await query(
      'SELECT COUNT(*) as count FROM orders_order WHERE status = "pending"'
    );

    // 获取未付订单用户数
    const orderNotPayPCount = await query(
      'SELECT COUNT(DISTINCT user_id) as count FROM orders_order WHERE status = "pending"'
    );

    // 获取已付订单数
    const orderPayedCount = await query(
      'SELECT COUNT(*) as count FROM orders_order WHERE status = "paid" OR status = "shipped" OR status = "delivered"'
    );

    // 获取已付订单用户数
    const orderPayedPCount = await query(
      'SELECT COUNT(DISTINCT user_id) as count FROM orders_order WHERE status = "paid" OR status = "shipped" OR status = "delivered"'
    );

    // 获取取消订单数
    const orderCancelCount = await query(
      'SELECT COUNT(*) as count FROM orders_order WHERE status = "cancelled"'
    );

    // 获取取消订单用户数
    const orderCancelPCount = await query(
      'SELECT COUNT(DISTINCT user_id) as count FROM orders_order WHERE status = "cancelled"'
    );

    // 获取最近7天的访问数据
    const visitData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const day = date.toISOString().split('T')[0];
      visitData.push({
        day,
        uv: Math.floor(Math.random() * 100) + 50, // 模拟数据
        pv: Math.floor(Math.random() * 200) + 100 // 模拟数据
      });
    }

    // 获取热门商品排名
    const orderRankData = await query(
      `SELECT p.id, p.name as title, COUNT(oi.id) as count
       FROM orders_orderitem oi
       JOIN products_product p ON oi.product_id = p.id
       GROUP BY p.id
       ORDER BY count DESC
       LIMIT 10`
    );

    // 获取热门分类排名
    const classificationRankData = await query(
      `SELECT c.id, c.name as title, COUNT(oi.id) as count
       FROM orders_orderitem oi
       JOIN products_product p ON oi.product_id = p.id
       JOIN categories_category c ON p.category_id = c.id
       GROUP BY c.id
       ORDER BY count DESC
       LIMIT 5`
    );

    res.json({
      // 新仪表盘数据
      user_count: userCount,
      order_count: orderCount,
      product_count: productCount,
      category_count: categoryCount,
      total_sales: totalSales,
      today_orders: todayOrders,
      today_sales: todaySales,
      order_status: orderStatusResult,
      last_7_days_orders: last7DaysOrdersResult,
      recent_orders: recentOrdersResult,
      recent_users: recentUsersResult,

      // 旧仪表盘数据
      thing_count: thingCount,
      thing_week_count: thingWeekCount[0].count,
      order_not_pay_count: orderNotPayCount[0].count,
      order_not_pay_p_count: orderNotPayPCount[0].count,
      order_payed_count: orderPayedCount[0].count,
      order_payed_p_count: orderPayedPCount[0].count,
      order_cancel_count: orderCancelCount[0].count,
      order_cancel_p_count: orderCancelPCount[0].count,
      visit_data: visitData,
      order_rank_data: orderRankData,
      classification_rank_data: classificationRankData
    });
  } catch (error) {
    logger.error('获取管理员仪表盘数据失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 管理员分类列表
router.get('/admin/classification', authenticateToken, async (req, res) => {
  try {
    // 获取当前用户ID
    const userId = req.user.id;
    const isSuperAdmin = req.user.is_superuser;

    let categories;

    if (isSuperAdmin) {
      // 超级管理员可以看到所有分类
      categories = await query(
        'SELECT * FROM categories_category ORDER BY name'
      );
    } else {
      // 普通商户只能看到自己的分类
      categories = await query(
        'SELECT * FROM categories_category WHERE merchant_id = ? ORDER BY name',
        [userId]
      );
    }

    // 获取每个分类的商品数量
    const categoriesWithCount = await Promise.all(categories.map(async (category) => {
      let countResult;

      if (isSuperAdmin) {
        countResult = await query(
          'SELECT COUNT(*) as count FROM products_product WHERE category_id = ?',
          [category.id]
        );
      } else {
        countResult = await query(
          'SELECT COUNT(*) as count FROM products_product WHERE category_id = ? AND merchant_id = ?',
          [category.id, userId]
        );
      }

      return {
        ...category,
        product_count: countResult[0].count
      };
    }));

    res.json(categoriesWithCount);
  } catch (error) {
    logger.error('获取分类列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建分类
router.post('/admin/classification', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    // 验证必填字段
    if (!name) {
      return res.status(400).json({ message: '分类名称为必填项' });
    }

    // 获取当前用户ID
    const userId = req.user.id;
    const isSuperAdmin = req.user.is_superuser;

    // 检查分类名称是否已存在（在当前商户的分类中）
    let existingCategories;

    if (isSuperAdmin) {
      existingCategories = await query(
        'SELECT * FROM categories_category WHERE name = ?',
        [name]
      );
    } else {
      existingCategories = await query(
        'SELECT * FROM categories_category WHERE name = ? AND merchant_id = ?',
        [name, userId]
      );
    }

    if (existingCategories.length > 0) {
      return res.status(400).json({ message: '分类名称已存在' });
    }

    // 创建分类
    const result = await query(
      'INSERT INTO categories_category (name, description, created_at, updated_at, merchant_id) VALUES (?, ?, NOW(), NOW(), ?)',
      [name, description || '', userId]
    );

    const categoryId = result.insertId;

    // 获取创建的分类
    const categories = await query(
      'SELECT * FROM categories_category WHERE id = ?',
      [categoryId]
    );

    res.status(201).json(categories[0]);
  } catch (error) {
    logger.error('创建分类失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新分类
router.put('/admin/classification/:id', authenticateToken, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description } = req.body;
    const userId = req.user.id;
    const isSuperAdmin = req.user.is_superuser;

    // 验证必填字段
    if (!name) {
      return res.status(400).json({ message: '分类名称为必填项' });
    }

    // 验证分类是否存在且属于当前商户
    let categories;

    if (isSuperAdmin) {
      // 超级管理员可以更新所有分类
      categories = await query(
        'SELECT * FROM categories_category WHERE id = ?',
        [categoryId]
      );
    } else {
      // 普通商户只能更新自己的分类
      categories = await query(
        'SELECT * FROM categories_category WHERE id = ? AND merchant_id = ?',
        [categoryId, userId]
      );
    }

    if (categories.length === 0) {
      return res.status(404).json({ message: '分类不存在或无权访问' });
    }

    // 检查分类名称是否已存在（排除当前分类，但仍在当前商户下）
    let existingCategories;

    if (isSuperAdmin) {
      existingCategories = await query(
        'SELECT * FROM categories_category WHERE name = ? AND id != ?',
        [name, categoryId]
      );
    } else {
      existingCategories = await query(
        'SELECT * FROM categories_category WHERE name = ? AND id != ? AND merchant_id = ?',
        [name, categoryId, userId]
      );
    }

    if (existingCategories.length > 0) {
      return res.status(400).json({ message: '分类名称已存在' });
    }

    // 更新分类
    if (isSuperAdmin) {
      await query(
        'UPDATE categories_category SET name = ?, description = ?, updated_at = NOW() WHERE id = ?',
        [name, description || '', categoryId]
      );
    } else {
      await query(
        'UPDATE categories_category SET name = ?, description = ?, updated_at = NOW() WHERE id = ? AND merchant_id = ?',
        [name, description || '', categoryId, userId]
      );
    }

    // 获取更新后的分类
    const updatedCategories = await query(
      'SELECT * FROM categories_category WHERE id = ?',
      [categoryId]
    );

    res.json(updatedCategories[0]);
  } catch (error) {
    logger.error('更新分类失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除分类
router.delete('/admin/classification/:id', authenticateToken, async (req, res) => {
  try {
    const categoryId = req.params.id;

    // 验证分类是否存在
    const categories = await query(
      'SELECT * FROM categories_category WHERE id = ?',
      [categoryId]
    );

    if (categories.length === 0) {
      return res.status(404).json({ message: '分类不存在' });
    }

    // 检查分类下是否有商品
    const products = await query(
      'SELECT COUNT(*) as count FROM products_product WHERE category_id = ?',
      [categoryId]
    );

    if (products[0].count > 0) {
      return res.status(400).json({ message: '无法删除有商品的分类' });
    }

    // 删除分类
    await query(
      'DELETE FROM categories_category WHERE id = ?',
      [categoryId]
    );

    res.json({ message: '分类已删除' });
  } catch (error) {
    logger.error('删除分类失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 用户列表API
router.get('/auth/users/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 10;
    const offset = (page - 1) * pageSize;

    // 获取用户总数
    const countResult = await query('SELECT COUNT(*) as count FROM user_auth_simpleuser');
    const totalCount = countResult[0].count;

    // 获取用户列表
    const users = await query(
      `SELECT id, username, email, is_staff, is_superuser, date_joined, last_login
       FROM user_auth_simpleuser
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    // 构造分页响应
    const response = {
      count: totalCount,
      next: page * pageSize < totalCount ? `/api/auth/users/?page=${page + 1}&page_size=${pageSize}` : null,
      previous: page > 1 ? `/api/auth/users/?page=${page - 1}&page_size=${pageSize}` : null,
      results: users
    };

    res.json(response);
  } catch (error) {
    logger.error('获取用户列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
