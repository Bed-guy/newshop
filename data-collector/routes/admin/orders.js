const express = require('express');
const router = express.Router();
const { query, pool } = require('../../db');
const { authenticateToken, isAdmin } = require('../../utils/auth');
const logger = require('../../logger');

// 获取所有订单（管理员）
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status, user_id, merchant_id, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM orders_order WHERE 1=1';
    const params = [];

    // 状态过滤
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    // 商户ID过滤（优先使用前端传递的merchant_id参数）
    if (merchant_id) {
      sql += ' AND merchant_id = ?';
      params.push(merchant_id);
    } else if (user_id) {
      // 如果提供了user_id，则查询该用户的订单（购买者）
      sql += ' AND user_id = ?';
      params.push(user_id);
    }

    // 根据当前登录的商户ID过滤订单
    // 只有超级管理员可以查看所有订单，普通商户只能查看自己的订单
    if (!req.user.is_superuser && !merchant_id && !user_id && req.user.is_merchant) {
      sql += ' AND merchant_id = ?';
      params.push(req.user.id);
    }

    // 添加排序和分页
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const orders = await query(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM orders_order WHERE 1=1';
    const countParams = [];

    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    if (user_id) {
      countSql += ' AND user_id = ?';
      countParams.push(user_id);
    }

    const totalResult = await query(countSql, countParams);
    const total = totalResult[0].total;

    // 获取每个订单的商品
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await query(
        `SELECT oi.*, p.name as product_name, p.image_url
         FROM orders_orderitem oi
         JOIN products_product p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );

      // 获取用户信息
      const users = await query(
        'SELECT id, username, email, first_name, last_name FROM user_auth_simpleuser WHERE id = ?',
        [order.user_id]
      );

      return {
        ...order,
        items,
        user: users.length > 0 ? users[0] : null
      };
    }));

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查询订单列表', 'order', ip]
    );

    res.json({
      items: ordersWithItems,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('获取订单列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取订单详情（管理员）
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;

    const orders = await query(
      'SELECT * FROM orders_order WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: '订单不存在' });
    }

    const order = orders[0];

    // 检查订单是否属于当前商户
    if (!req.user.is_superuser && req.user.is_merchant && order.merchant_id && order.merchant_id !== req.user.id) {
      return res.status(403).json({ message: '您没有权限查看此订单' });
    }

    // 获取订单商品
    const items = await query(
      `SELECT oi.*, p.name as product_name, p.image_url
       FROM orders_orderitem oi
       JOIN products_product p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    // 获取用户信息
    const users = await query(
      'SELECT id, username, email, first_name, last_name FROM user_auth_simpleuser WHERE id = ?',
      [order.user_id]
    );

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', `查看订单详情: ID=${orderId}`, 'order', orderId, ip]
    );

    res.json({
      ...order,
      items,
      user: users.length > 0 ? users[0] : null
    });
  } catch (error) {
    logger.error('获取订单详情失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新订单状态（管理员）
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

    // 检查订单是否属于当前商户
    if (!req.user.is_superuser && req.user.is_merchant && orders[0].merchant_id && orders[0].merchant_id !== req.user.id) {
      return res.status(403).json({ message: '您没有权限修改此订单' });
    }

    // 更新订单状态
    await query(
      'UPDATE orders_order SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, orderId]
    );

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
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

    // 获取用户信息
    const users = await query(
      'SELECT id, username, email, first_name, last_name FROM user_auth_simpleuser WHERE id = ?',
      [updatedOrders[0].user_id]
    );

    logger.info(`管理员更新订单状态: ID=${orderId}, 状态=${status}`);

    res.json({
      ...updatedOrders[0],
      items,
      user: users.length > 0 ? users[0] : null
    });
  } catch (error) {
    logger.error('更新订单状态失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除订单（管理员）
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const orderId = req.params.id;

    // 验证订单是否存在
    const [orders] = await connection.query(
      'SELECT * FROM orders_order WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: '订单不存在' });
    }

    // 检查订单是否属于当前商户
    if (!req.user.is_superuser && req.user.is_merchant && orders[0].merchant_id && orders[0].merchant_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({ message: '您没有权限删除此订单' });
    }

    // 删除订单项
    await connection.query(
      'DELETE FROM orders_orderitem WHERE order_id = ?',
      [orderId]
    );

    // 删除订单
    await connection.query(
      'DELETE FROM orders_order WHERE id = ?',
      [orderId]
    );

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await connection.query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'delete', `删除订单: ID=${orderId}`, 'order', orderId, ip]
    );

    await connection.commit();

    logger.info(`管理员删除订单: ID=${orderId}`);

    res.json({ message: '订单已删除' });
  } catch (error) {
    await connection.rollback();
    logger.error('删除订单失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  } finally {
    connection.release();
  }
});

module.exports = router;
