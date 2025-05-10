const express = require('express');
const router = express.Router();
const { query, pool } = require('../db');
const { authenticateToken, isAdmin } = require('../utils/auth');
const logger = require('../logger');

// 创建订单
router.post('/', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { recipient_name, recipient_phone, shipping_address, items } = req.body;
    const userId = req.user.id;

    // 验证必填字段
    if (!recipient_name || !recipient_phone || !shipping_address) {
      return res.status(400).json({ message: '收件人姓名、电话和地址为必填项' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: '订单项为必填项' });
    }

    // 获取订单项的商品信息
    const orderItems = [];

    for (const item of items) {
      // 验证订单项必填字段
      if (!item.product || !item.quantity || !item.price) {
        await connection.rollback();
        return res.status(400).json({ message: '订单项缺少必填字段' });
      }

      // 获取商品信息
      const [products] = await connection.query(
        'SELECT * FROM products_product WHERE id = ?',
        [item.product]
      );

      if (products.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: `商品 ${item.product} 不存在` });
      }

      const product = products[0];

      // 验证库存是否充足
      if (product.stock < item.quantity) {
        await connection.rollback();
        return res.status(400).json({ message: `商品 ${item.product} 库存不足` });
      }

      orderItems.push({
        product_id: item.product,
        quantity: item.quantity,
        price: item.price,
        stock: product.stock,
        category_id: product.category_id
      });
    }

    if (orderItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: '订单项为空' });
    }

    // 计算总价
    const totalAmount = orderItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // 获取商品所属的商户ID（假设一个订单只能包含一个商户的商品）
    const merchantId = orderItems[0].product_id ?
      (await connection.query('SELECT merchant_id FROM products_product WHERE id = ?', [orderItems[0].product_id]))[0][0].merchant_id :
      null;

    // 创建订单
    const [orderResult] = await connection.query(
      `INSERT INTO orders_order
       (user_id, merchant_id, recipient_name, recipient_phone, shipping_address,
        total_amount, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [userId, merchantId, recipient_name, recipient_phone, shipping_address, totalAmount]
    );

    const orderId = orderResult.insertId;

    // 创建订单项
    for (const item of orderItems) {
      // 获取商品所属的商户ID
      const [productResult] = await connection.query(
        'SELECT merchant_id FROM products_product WHERE id = ?',
        [item.product_id]
      );
      const productMerchantId = productResult.length > 0 ? productResult[0].merchant_id : null;

      await connection.query(
        `INSERT INTO orders_orderitem
         (order_id, product_id, merchant_id, quantity, price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.product_id, productMerchantId, item.quantity, item.price]
      );

      // 更新商品库存
      await connection.query(
        'UPDATE products_product SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );

      // 记录购买日志
      await connection.query(
        `INSERT INTO purchase_logs
         (user_id, product_id, category_id, purchase_date, unit_price, quantity, total_price, order_id)
         VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)`,
        [
          userId,
          item.product_id,
          item.category_id,
          item.price,
          item.quantity,
          item.price * item.quantity,
          orderId
        ]
      );
    }

    // 清空购物车中的相关商品
    for (const item of orderItems) {
      await connection.query(
        'DELETE FROM shopping_cart WHERE user_id = ? AND product_id = ?',
        [userId, item.product_id]
      );
    }

    // 提交事务
    await connection.commit();

    // 获取创建的订单
    const [orders] = await connection.query(
      'SELECT * FROM orders_order WHERE id = ?',
      [orderId]
    );

    const [orderItemDetails] = await connection.query(
      `SELECT oi.*, p.name as product_name, p.image_url
       FROM orders_orderitem oi
       JOIN products_product p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    logger.info(`订单创建成功: ID=${orderId}, 总金额=${totalAmount}`);

    res.status(201).json({
      ...orders[0],
      items: orderItemDetails
    });
  } catch (error) {
    await connection.rollback();
    logger.error('创建订单失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  } finally {
    connection.release();
  }
});

// 获取用户订单列表
router.get('/user', async (req, res) => {
  try {
    const userId = req.user.id;

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
    logger.error('获取用户订单列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取单个订单
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;

    const orders = await query(
      'SELECT * FROM orders_order WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: '订单不存在' });
    }

    const items = await query(
      `SELECT oi.*, p.name as product_name, p.image_url
       FROM orders_orderitem oi
       JOIN products_product p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    res.json({
      ...orders[0],
      items
    });
  } catch (error) {
    logger.error('获取订单详情失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新订单状态 (需要管理员权限)
router.put('/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    // 验证必填字段
    if (!status) {
      return res.status(400).json({ message: '状态为必填项' });
    }

    // 验证状态值
    const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: '无效的状态值' });
    }

    // 验证订单是否存在
    const orders = await query(
      'SELECT * FROM orders_order WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: '订单不存在' });
    }

    // 更新订单状态
    await query(
      'UPDATE orders_order SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, orderId]
    );

    // 记录管理员操作
    const ip = req.ip || req.connection.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'update', `更新订单状态: ${status}`, 'order', orderId, ip]
    );

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

    logger.info(`管理员更新订单状态: ID=${orderId}, 状态=${status}`);

    res.json({
      ...updatedOrders[0],
      items
    });
  } catch (error) {
    logger.error('更新订单状态失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取所有订单 (需要管理员权限) 或 获取用户自己的订单
router.get('/', authenticateToken, async (req, res) => {
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
  try {
    const { status, limit = 50, offset = 0, merchant_id } = req.query;

    let sql = 'SELECT * FROM orders_order WHERE 1=1';
    const params = [];

    // 商户ID过滤（优先使用）
    if (merchant_id) {
      sql += ' AND merchant_id = ?';
      params.push(merchant_id);
    }
    // 用户ID过滤（如果不是管理员请求且没有提供merchant_id）
    else if (!isAdminRequest || req.query.user_id) {
      sql += ' AND user_id = ?';
      params.push(req.query.user_id);
    }
    // 如果是商户用户，只显示该商户的订单
    else if (req.user.is_merchant) {
      sql += ' AND merchant_id = ?';
      params.push(req.user.id);
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
      const ip = req.ip || req.connection.remoteAddress;
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

// 支付订单
router.post('/:id/pay', authenticateToken, async (req, res) => {
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
    const ip = req.ip || req.connection.remoteAddress;
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

module.exports = router;
