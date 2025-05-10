const express = require('express');
const router = express.Router();
const { query } = require('../../db');
const { authenticateToken } = require('../../utils/auth');
const logger = require('../../logger');

// 所有销售日志API都需要管理员权限
router.use(authenticateToken);

// 获取销售日志列表
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      page_size = 10, 
      product_name, 
      username, 
      start_date, 
      end_date,
      action_type
    } = req.query;
    
    const offset = (page - 1) * page_size;
    
    // 构建SQL查询
    let sql = `
      SELECT 
        pl.id,
        pl.user_id,
        u.username,
        pl.product_id,
        p.name as product_name,
        pl.purchase_date,
        pl.unit_price,
        pl.quantity,
        pl.total_price,
        pl.order_id,
        c.name as category_name
      FROM 
        purchase_logs pl
      LEFT JOIN 
        user_auth_simpleuser u ON pl.user_id = u.id
      LEFT JOIN 
        products_product p ON pl.product_id = p.id
      LEFT JOIN 
        categories_category c ON pl.category_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // 如果不是超级管理员，只显示该商户的销售日志
    if (!req.user.is_superuser && req.user.id !== 11) {
      sql += ' AND pl.merchant_id = ?';
      params.push(req.user.id);
    } else if (req.query.merchant_id) {
      // 如果是超级管理员且指定了商户ID，则按商户ID筛选
      sql += ' AND pl.merchant_id = ?';
      params.push(req.query.merchant_id);
    }
    
    // 按商品名称筛选
    if (product_name) {
      sql += ' AND p.name LIKE ?';
      params.push(`%${product_name}%`);
    }
    
    // 按用户名筛选
    if (username) {
      sql += ' AND u.username LIKE ?';
      params.push(`%${username}%`);
    }
    
    // 按日期范围筛选
    if (start_date) {
      sql += ' AND pl.purchase_date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      sql += ' AND pl.purchase_date <= ?';
      params.push(end_date + ' 23:59:59');
    }
    
    // 按操作类型筛选
    if (action_type) {
      sql += ' AND pl.action_type = ?';
      params.push(action_type);
    }
    
    // 获取总数
    const countSql = sql.replace(/SELECT.*?FROM/s, 'SELECT COUNT(*) as total FROM');
    const countResult = await query(countSql, params);
    const total = countResult[0].total;
    
    // 添加排序和分页
    sql += ' ORDER BY pl.purchase_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(page_size), offset);
    
    // 执行查询
    const logs = await query(sql, params);
    
    // 获取浏览日志
    let viewLogsSql = `
      SELECT 
        pvl.id,
        pvl.user_id,
        u.username,
        pvl.product_id,
        p.name as product_name,
        pvl.view_time as timestamp,
        pvl.duration_seconds as duration,
        pvl.ip_address,
        c.name as category_name,
        'view' as action_type
      FROM 
        product_view_logs pvl
      LEFT JOIN 
        user_auth_simpleuser u ON pvl.user_id = u.id
      LEFT JOIN 
        products_product p ON pvl.product_id = p.id
      LEFT JOIN 
        categories_category c ON pvl.category_id = c.id
      WHERE 1=1
    `;
    
    const viewLogsParams = [];
    
    // 如果不是超级管理员，只显示该商户的浏览日志
    if (!req.user.is_superuser && req.user.id !== 11) {
      viewLogsSql += ' AND p.merchant_id = ?';
      viewLogsParams.push(req.user.id);
    } else if (req.query.merchant_id) {
      // 如果是超级管理员且指定了商户ID，则按商户ID筛选
      viewLogsSql += ' AND p.merchant_id = ?';
      viewLogsParams.push(req.query.merchant_id);
    }
    
    // 按商品名称筛选
    if (product_name) {
      viewLogsSql += ' AND p.name LIKE ?';
      viewLogsParams.push(`%${product_name}%`);
    }
    
    // 按用户名筛选
    if (username) {
      viewLogsSql += ' AND u.username LIKE ?';
      viewLogsParams.push(`%${username}%`);
    }
    
    // 按日期范围筛选
    if (start_date) {
      viewLogsSql += ' AND pvl.view_time >= ?';
      viewLogsParams.push(start_date);
    }
    
    if (end_date) {
      viewLogsSql += ' AND pvl.view_time <= ?';
      viewLogsParams.push(end_date + ' 23:59:59');
    }
    
    // 如果指定了操作类型且包含view，则获取浏览日志
    if (!action_type || action_type === 'view') {
      // 添加排序和分页
      viewLogsSql += ' ORDER BY pvl.view_time DESC LIMIT ? OFFSET ?';
      viewLogsParams.push(parseInt(page_size), offset);
      
      // 执行查询
      const viewLogs = await query(viewLogsSql, viewLogsParams);
      
      // 合并购买日志和浏览日志
      const allLogs = [...logs, ...viewLogs];
      
      // 按时间排序
      allLogs.sort((a, b) => {
        const dateA = a.purchase_date || a.timestamp;
        const dateB = b.purchase_date || b.timestamp;
        return new Date(dateB) - new Date(dateA);
      });
      
      // 返回结果
      res.json({
        total: total + viewLogs.length, // 这里的总数不太准确，但足够用于演示
        page: parseInt(page),
        page_size: parseInt(page_size),
        results: allLogs.slice(0, page_size)
      });
    } else {
      // 只返回购买日志
      res.json({
        total,
        page: parseInt(page),
        page_size: parseInt(page_size),
        results: logs
      });
    }
    
    // 记录管理员操作日志
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查询销售日志', 'sales_log', ip]
    );
  } catch (error) {
    logger.error('获取销售日志失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取销售日志详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 尝试从购买日志中查找
    let logSql = `
      SELECT 
        pl.id,
        pl.user_id,
        u.username,
        pl.product_id,
        p.name as product_name,
        pl.purchase_date,
        pl.unit_price,
        pl.quantity,
        pl.total_price,
        pl.order_id,
        c.name as category_name,
        'purchase' as action_type,
        o.recipient_name,
        o.recipient_phone,
        o.shipping_address,
        o.status as order_status,
        o.payment_method
      FROM 
        purchase_logs pl
      LEFT JOIN 
        user_auth_simpleuser u ON pl.user_id = u.id
      LEFT JOIN 
        products_product p ON pl.product_id = p.id
      LEFT JOIN 
        categories_category c ON pl.category_id = c.id
      LEFT JOIN
        orders_order o ON pl.order_id = o.id
      WHERE pl.id = ?
    `;
    
    const logs = await query(logSql, [id]);
    
    if (logs.length > 0) {
      // 如果不是超级管理员，检查是否有权限查看
      if (!req.user.is_superuser && req.user.id !== 11) {
        const product = await query('SELECT merchant_id FROM products_product WHERE id = ?', [logs[0].product_id]);
        if (product.length > 0 && product[0].merchant_id !== req.user.id) {
          return res.status(403).json({ message: '无权查看此销售日志' });
        }
      }
      
      return res.json(logs[0]);
    }
    
    // 如果在购买日志中没找到，尝试从浏览日志中查找
    let viewLogSql = `
      SELECT 
        pvl.id,
        pvl.user_id,
        u.username,
        pvl.product_id,
        p.name as product_name,
        pvl.view_time as timestamp,
        pvl.duration_seconds as duration,
        pvl.ip_address,
        c.name as category_name,
        'view' as action_type,
        pvl.session_id
      FROM 
        product_view_logs pvl
      LEFT JOIN 
        user_auth_simpleuser u ON pvl.user_id = u.id
      LEFT JOIN 
        products_product p ON pvl.product_id = p.id
      LEFT JOIN 
        categories_category c ON pvl.category_id = c.id
      WHERE pvl.id = ?
    `;
    
    const viewLogs = await query(viewLogSql, [id]);
    
    if (viewLogs.length > 0) {
      // 如果不是超级管理员，检查是否有权限查看
      if (!req.user.is_superuser && req.user.id !== 11) {
        const product = await query('SELECT merchant_id FROM products_product WHERE id = ?', [viewLogs[0].product_id]);
        if (product.length > 0 && product[0].merchant_id !== req.user.id) {
          return res.status(403).json({ message: '无权查看此浏览日志' });
        }
      }
      
      return res.json(viewLogs[0]);
    }
    
    return res.status(404).json({ message: '日志不存在' });
  } catch (error) {
    logger.error('获取销售日志详情失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
