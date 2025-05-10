const express = require('express');
const router = express.Router();
const { query } = require('../../db');
const { authenticateToken, isAdmin } = require('../../utils/auth');
const logger = require('../../logger');
const moment = require('moment');

// 所有销售业绩API都需要管理员权限
router.use(authenticateToken, isAdmin);

// 获取销售业绩概览
router.get('/overview', async (req, res) => {
  try {
    const { start_date, end_date, merchant_id } = req.query;

    // 设置默认日期范围为过去30天
    const defaultStartDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
    const defaultEndDate = moment().format('YYYY-MM-DD');

    // 使用提供的日期范围或默认值
    const startDate = start_date || defaultStartDate;
    const endDate = end_date || defaultEndDate;

    // 计算上一个时间段（用于计算趋势）
    const previousStartDate = moment(startDate).subtract(moment(endDate).diff(moment(startDate), 'days'), 'days').format('YYYY-MM-DD');
    const previousEndDate = moment(startDate).subtract(1, 'days').format('YYYY-MM-DD');

    // 构建SQL查询条件
    let whereClause = 'WHERE o.status != "cancelled" AND o.created_at BETWEEN ? AND ?';
    let previousWhereClause = 'WHERE o.status != "cancelled" AND o.created_at BETWEEN ? AND ?';
    let params = [startDate, endDate];
    let previousParams = [previousStartDate, previousEndDate];

    // 如果指定了商户ID，添加过滤条件
    if (merchant_id && merchant_id !== 'all') {
      whereClause += ' AND o.merchant_id = ?';
      previousWhereClause += ' AND o.merchant_id = ?';
      params.push(merchant_id);
      previousParams.push(merchant_id);
    }

    // 获取当前时间段的销售数据
    const currentPeriodSql = `
      SELECT
        SUM(o.total_amount) as total_sales,
        COUNT(DISTINCT o.id) as order_count,
        COUNT(DISTINCT p.id) as product_count
      FROM orders_order o
      LEFT JOIN orders_orderitem oi ON o.id = oi.order_id
      LEFT JOIN products_product p ON oi.product_id = p.id
      ${whereClause}
    `;

    // 获取上一个时间段的销售数据（用于计算趋势）
    const previousPeriodSql = `
      SELECT
        SUM(o.total_amount) as total_sales,
        COUNT(DISTINCT o.id) as order_count,
        COUNT(DISTINCT p.id) as product_count
      FROM orders_order o
      LEFT JOIN orders_orderitem oi ON o.id = oi.order_id
      LEFT JOIN products_product p ON oi.product_id = p.id
      ${previousWhereClause}
    `;

    // 执行查询
    const currentPeriodResult = await query(currentPeriodSql, params);
    const previousPeriodResult = await query(previousPeriodSql, previousParams);

    // 提取结果
    const currentPeriod = currentPeriodResult[0] || { total_sales: 0, order_count: 0, product_count: 0 };
    const previousPeriod = previousPeriodResult[0] || { total_sales: 0, order_count: 0, product_count: 0 };

    // 计算客单价
    const currentAOV = currentPeriod.order_count > 0 ? currentPeriod.total_sales / currentPeriod.order_count : 0;
    const previousAOV = previousPeriod.order_count > 0 ? previousPeriod.total_sales / previousPeriod.order_count : 0;

    // 计算趋势（百分比变化）
    const calculateTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const salesTrend = calculateTrend(currentPeriod.total_sales || 0, previousPeriod.total_sales || 0);
    const orderTrend = calculateTrend(currentPeriod.order_count || 0, previousPeriod.order_count || 0);
    const aovTrend = calculateTrend(currentAOV || 0, previousAOV || 0);
    const productTrend = calculateTrend(currentPeriod.product_count || 0, previousPeriod.product_count || 0);

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查看销售业绩概览', 'sales_performance', ip]
    );

    // 返回结果
    res.json({
      total_sales: currentPeriod.total_sales || 0,
      sales_trend: parseFloat(salesTrend.toFixed(2)),
      order_count: currentPeriod.order_count || 0,
      order_trend: parseFloat(orderTrend.toFixed(2)),
      average_order_value: parseFloat(currentAOV.toFixed(2)),
      aov_trend: parseFloat(aovTrend.toFixed(2)),
      product_count: currentPeriod.product_count || 0,
      product_trend: parseFloat(productTrend.toFixed(2)),
      period: {
        start_date: startDate,
        end_date: endDate
      }
    });
  } catch (error) {
    logger.error('获取销售业绩概览失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取销售趋势数据
router.get('/trends', async (req, res) => {
  try {
    const { start_date, end_date, merchant_id, interval = 'day' } = req.query;

    // 设置默认日期范围为过去30天
    const defaultStartDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
    const defaultEndDate = moment().format('YYYY-MM-DD');

    // 使用提供的日期范围或默认值
    const startDate = start_date || defaultStartDate;
    const endDate = end_date || defaultEndDate;

    // 根据间隔选择日期格式和分组
    let dateFormat, dateGroup;
    switch (interval) {
      case 'week':
        dateFormat = '%Y-%u'; // ISO周格式 YYYY-WW
        dateGroup = 'YEARWEEK(o.created_at, 1)';
        break;
      case 'month':
        dateFormat = '%Y-%m'; // 月份格式 YYYY-MM
        dateGroup = 'DATE_FORMAT(o.created_at, "%Y-%m")';
        break;
      case 'year':
        dateFormat = '%Y'; // 年份格式 YYYY
        dateGroup = 'YEAR(o.created_at)';
        break;
      default: // 默认按天
        dateFormat = '%Y-%m-%d'; // 日期格式 YYYY-MM-DD
        dateGroup = 'DATE(o.created_at)';
    }

    // 构建SQL查询条件
    let whereClause = 'WHERE o.status != "cancelled" AND o.created_at BETWEEN ? AND ?';
    let params = [startDate, endDate];

    // 如果指定了商户ID，添加过滤条件
    if (merchant_id && merchant_id !== 'all') {
      whereClause += ' AND o.merchant_id = ?';
      params.push(merchant_id);
    }

    // 获取销售趋势数据
    const trendsSql = `
      SELECT
        ${dateGroup} as date_group,
        DATE_FORMAT(MIN(o.created_at), '${dateFormat}') as date,
        SUM(o.total_amount) as sales_amount,
        COUNT(DISTINCT o.id) as order_count,
        COUNT(DISTINCT o.user_id) as customer_count
      FROM orders_order o
      ${whereClause}
      GROUP BY date_group
      ORDER BY date_group
    `;

    // 执行查询
    const trendsResult = await query(trendsSql, params);

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查看销售趋势数据', 'sales_performance', ip]
    );

    // 返回结果
    res.json(trendsResult);
  } catch (error) {
    logger.error('获取销售趋势数据失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取商户销售业绩列表
router.get('/merchants', async (req, res) => {
  try {
    const { start_date, end_date, page = 1, limit = 10, sort_field, sort_order } = req.query;

    // 设置默认日期范围为过去30天
    const defaultStartDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
    const defaultEndDate = moment().format('YYYY-MM-DD');

    // 使用提供的日期范围或默认值
    const startDate = start_date || defaultStartDate;
    const endDate = end_date || defaultEndDate;

    // 计算分页偏移量
    const offset = (page - 1) * limit;

    // 构建排序条件
    let orderClause = '';
    if (sort_field && sort_order) {
      const direction = sort_order === 'descend' ? 'DESC' : 'ASC';
      switch (sort_field) {
        case 'sales_amount':
          orderClause = `ORDER BY sales_amount ${direction}`;
          break;
        case 'order_count':
          orderClause = `ORDER BY order_count ${direction}`;
          break;
        case 'average_order_value':
          orderClause = `ORDER BY average_order_value ${direction}`;
          break;
        case 'product_count':
          orderClause = `ORDER BY product_count ${direction}`;
          break;
        default:
          orderClause = 'ORDER BY sales_amount DESC';
      }
    } else {
      orderClause = 'ORDER BY sales_amount DESC';
    }

    // 获取商户销售业绩数据
    const merchantsSql = `
      SELECT
        u.id,
        u.username,
        SUM(o.total_amount) as sales_amount,
        COUNT(DISTINCT o.id) as order_count,
        COUNT(DISTINCT p.id) as product_count,
        SUM(o.total_amount) / COUNT(DISTINCT o.id) as average_order_value
      FROM user_auth_simpleuser u
      LEFT JOIN orders_order o ON u.id = o.merchant_id AND o.status != "cancelled" AND o.created_at BETWEEN ? AND ?
      LEFT JOIN orders_orderitem oi ON o.id = oi.order_id
      LEFT JOIN products_product p ON oi.product_id = p.id AND p.merchant_id = u.id
      WHERE u.is_merchant = 1
      GROUP BY u.id
      ${orderClause}
      LIMIT ? OFFSET ?
    `;

    // 获取商户总数
    const countSql = `
      SELECT COUNT(*) as total
      FROM user_auth_simpleuser
      WHERE is_merchant = 1
    `;

    // 执行查询
    const merchantsResult = await query(merchantsSql, [startDate, endDate, parseInt(limit), offset]);
    const countResult = await query(countSql);

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查看商户销售业绩列表', 'sales_performance', ip]
    );

    // 返回结果
    res.json({
      items: merchantsResult,
      total: countResult[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('获取商户销售业绩列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取商户销售详情
router.get('/merchants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    // 设置默认日期范围为过去30天
    const defaultStartDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
    const defaultEndDate = moment().format('YYYY-MM-DD');

    // 使用提供的日期范围或默认值
    const startDate = start_date || defaultStartDate;
    const endDate = end_date || defaultEndDate;

    // 获取商户基本信息
    const merchantSql = `
      SELECT id, username, email, date_joined, is_superuser
      FROM user_auth_simpleuser
      WHERE id = ? AND is_merchant = 1
    `;

    // 获取商户销售业绩数据
    const performanceSql = `
      SELECT
        SUM(o.total_amount) as sales_amount,
        COUNT(DISTINCT o.id) as order_count,
        COUNT(DISTINCT p.id) as product_count,
        SUM(o.total_amount) / COUNT(DISTINCT o.id) as average_order_value
      FROM orders_order o
      LEFT JOIN orders_orderitem oi ON o.id = oi.order_id
      LEFT JOIN products_product p ON oi.product_id = p.id AND p.merchant_id = ?
      WHERE o.merchant_id = ? AND o.status != "cancelled" AND o.created_at BETWEEN ? AND ?
    `;

    // 获取商户热销商品
    const productsSql = `
      SELECT
        p.id,
        p.name,
        p.price,
        p.stock,
        SUM(oi.quantity) as sales_count,
        SUM(oi.quantity * oi.price) as sales_amount
      FROM products_product p
      JOIN orders_orderitem oi ON p.id = oi.product_id
      JOIN orders_order o ON oi.order_id = o.id
      WHERE p.merchant_id = ? AND o.status != "cancelled" AND o.created_at BETWEEN ? AND ?
      GROUP BY p.id
      ORDER BY sales_count DESC
      LIMIT 10
    `;

    // 获取商户销售趋势
    const trendsSql = `
      SELECT
        DATE(o.created_at) as date,
        SUM(o.total_amount) as sales_amount,
        COUNT(DISTINCT o.id) as order_count
      FROM orders_order o
      WHERE o.merchant_id = ? AND o.status != "cancelled" AND o.created_at BETWEEN ? AND ?
      GROUP BY DATE(o.created_at)
      ORDER BY date
    `;

    // 执行查询
    const merchantResult = await query(merchantSql, [id]);

    // 如果商户不存在，返回404
    if (merchantResult.length === 0) {
      return res.status(404).json({ message: '商户不存在' });
    }

    const performanceResult = await query(performanceSql, [id, id, startDate, endDate]);
    const productsResult = await query(productsSql, [id, startDate, endDate]);
    const trendsResult = await query(trendsSql, [id, startDate, endDate]);

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', `查看商户(ID:${id})销售详情`, 'sales_performance', ip]
    );

    // 合并结果
    const merchant = {
      ...merchantResult[0],
      ...performanceResult[0],
      products: productsResult,
      trends: trendsResult
    };

    // 返回结果
    res.json(merchant);
  } catch (error) {
    logger.error('获取商户销售详情失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
