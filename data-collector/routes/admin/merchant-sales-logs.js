const express = require('express');
const router = express.Router();
const { query } = require('../../db');
const { authenticateToken, isAdmin } = require('../../utils/auth');
const logger = require('../../logger');

// 所有商户销售日志API都需要管理员权限
router.use(authenticateToken, isAdmin);

// 获取商户销售日志列表
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      page_size = 10,
      product_name,
      username,
      start_date,
      end_date,
      ordering = '-created_at'
    } = req.query;

    // 获取当前商户ID
    const merchantId = req.user.id;

    // 构建SQL查询条件
    let whereClause = 'WHERE p.merchant_id = ?';
    let params = [merchantId];

    if (product_name) {
      whereClause += ' AND p.name LIKE ?';
      params.push(`%${product_name}%`);
    }

    if (username) {
      whereClause += ' AND u.username LIKE ?';
      params.push(`%${username}%`);
    }

    if (start_date && end_date) {
      whereClause += ' AND o.created_at BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    // 构建排序条件
    let orderClause = '';
    if (ordering) {
      const direction = ordering.startsWith('-') ? 'DESC' : 'ASC';
      const field = ordering.startsWith('-') ? ordering.substring(1) : ordering;
      // 在合并查询中，我们需要使用别名
      orderClause = `ORDER BY timestamp ${direction}`;
    } else {
      // 默认按时间倒序排序
      orderClause = `ORDER BY timestamp DESC`;
    }

    // 计算分页偏移量
    const offset = (page - 1) * page_size;

    // 获取浏览日志
    const viewLogsSql = `
      SELECT
        pvl.id,
        pvl.user_id,
        u.username,
        pvl.product_id,
        p.name as product_name,
        'view' as action_type,
        pvl.ip_address,
        pvl.view_time as timestamp,
        pvl.duration_seconds as duration,
        NULL as user_agent
      FROM product_view_logs pvl
      LEFT JOIN user_auth_simpleuser u ON pvl.user_id = u.id
      JOIN products_product p ON pvl.product_id = p.id
      WHERE p.merchant_id = ?
      ${start_date && end_date ? 'AND pvl.view_time BETWEEN ? AND ?' : ''}
      ${product_name ? 'AND p.name LIKE ?' : ''}
      ${username ? 'AND u.username LIKE ?' : ''}
    `;

    // 获取购买日志（使用订单和订单项表）
    const purchaseLogsSql = `
      SELECT
        o.id,
        o.user_id,
        u.username,
        oi.product_id,
        p.name as product_name,
        'purchase' as action_type,
        pl.ip_address,
        o.created_at as timestamp,
        NULL as duration,
        NULL as user_agent
      FROM orders_order o
      JOIN orders_orderitem oi ON o.id = oi.order_id
      JOIN products_product p ON oi.product_id = p.id
      LEFT JOIN user_auth_simpleuser u ON o.user_id = u.id
      LEFT JOIN payment_logs pl ON o.id = pl.order_id
      ${whereClause}
    `;

    // 构建查询参数
    let viewParams = [merchantId];
    if (start_date && end_date) {
      viewParams.push(start_date, end_date);
    }
    if (product_name) {
      viewParams.push(`%${product_name}%`);
    }
    if (username) {
      viewParams.push(`%${username}%`);
    }

    // 合并查询结果
    const combinedSql = `
      SELECT * FROM (
        (${viewLogsSql})
        UNION ALL
        (${purchaseLogsSql})
      ) as combined_logs
      ${orderClause}
      LIMIT ? OFFSET ?
    `;

    // 获取总记录数
    const countSql = `
      SELECT COUNT(*) as total FROM (
        (${viewLogsSql})
        UNION ALL
        (${purchaseLogsSql})
      ) as combined_logs
    `;

    // 执行查询
    const logsResult = await query(combinedSql, [...viewParams, ...params, parseInt(page_size), offset]);
    const countResult = await query(countSql, [...viewParams, ...params]);

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查看商户销售日志列表', 'merchant_sales_logs', ip]
    );

    // 返回结果
    res.json({
      results: logsResult,
      total: countResult[0].total,
      page: parseInt(page),
      page_size: parseInt(page_size)
    });
  } catch (error) {
    logger.error('获取商户销售日志列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取商户销售日志详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'view' } = req.query; // 日志类型：view 或 purchase

    // 获取当前商户ID
    const merchantId = req.user.id;

    let logSql = '';
    let params = [];

    if (type === 'view') {
      // 获取浏览日志详情
      logSql = `
        SELECT
          pvl.id,
          pvl.user_id,
          u.username,
          pvl.product_id,
          p.name as product_name,
          'view' as action_type,
          pvl.ip_address,
          pvl.view_time as timestamp,
          pvl.duration_seconds as duration,
          NULL as user_agent,
          c.name as category_name
        FROM product_view_logs pvl
        LEFT JOIN user_auth_simpleuser u ON pvl.user_id = u.id
        JOIN products_product p ON pvl.product_id = p.id
        LEFT JOIN categories_category c ON p.category_id = c.id
        WHERE pvl.id = ? AND p.merchant_id = ?
      `;
      params = [id, merchantId];
    } else {
      // 获取购买日志详情
      logSql = `
        SELECT
          o.id,
          o.user_id,
          u.username,
          oi.product_id,
          p.name as product_name,
          'purchase' as action_type,
          pl.ip_address,
          o.created_at as timestamp,
          NULL as duration,
          NULL as user_agent,
          c.name as category_name,
          oi.quantity,
          oi.price,
          o.total_amount,
          o.status,
          o.payment_method,
          o.payment_time
        FROM orders_order o
        JOIN orders_orderitem oi ON o.id = oi.order_id
        JOIN products_product p ON oi.product_id = p.id
        LEFT JOIN categories_category c ON p.category_id = c.id
        LEFT JOIN user_auth_simpleuser u ON o.user_id = u.id
        LEFT JOIN payment_logs pl ON o.id = pl.order_id
        WHERE o.id = ? AND p.merchant_id = ?
      `;
      params = [id, merchantId];
    }

    // 执行查询
    const logResult = await query(logSql, params);

    // 如果日志不存在，返回404
    if (logResult.length === 0) {
      return res.status(404).json({ message: '销售日志不存在' });
    }

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', `查看商户销售日志详情(ID:${id})`, 'merchant_sales_logs', ip]
    );

    // 返回结果
    res.json(logResult[0]);
  } catch (error) {
    logger.error('获取商户销售日志详情失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
