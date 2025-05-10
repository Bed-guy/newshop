const express = require('express');
const router = express.Router();
const { query } = require('../../db');
const { authenticateToken, isAdmin } = require('../../utils/auth');
const logger = require('../../logger');
const moment = require('moment');

// 所有销售报表API都需要管理员权限
router.use(authenticateToken, isAdmin);

// 获取销售报表概览
router.get('/overview', async (req, res) => {
  try {
    const { start_date, end_date, merchant_id, report_type = 'monthly' } = req.query;

    // 根据报表类型设置默认日期范围
    let defaultStartDate, defaultEndDate;
    switch (report_type) {
      case 'daily':
        defaultStartDate = moment().subtract(1, 'days').format('YYYY-MM-DD');
        defaultEndDate = moment().format('YYYY-MM-DD');
        break;
      case 'weekly':
        defaultStartDate = moment().subtract(7, 'days').format('YYYY-MM-DD');
        defaultEndDate = moment().format('YYYY-MM-DD');
        break;
      case 'yearly':
        defaultStartDate = moment().subtract(1, 'years').format('YYYY-MM-DD');
        defaultEndDate = moment().format('YYYY-MM-DD');
        break;
      case 'monthly':
      default:
        defaultStartDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
        defaultEndDate = moment().format('YYYY-MM-DD');
    }

    // 使用提供的日期范围或默认值
    const startDate = start_date || defaultStartDate;
    const endDate = end_date || defaultEndDate;

    // 构建SQL查询条件
    let whereClause = 'WHERE o.status != "cancelled" AND o.created_at BETWEEN ? AND ?';
    let params = [startDate, endDate];

    // 如果指定了商户ID，添加过滤条件
    if (merchant_id && merchant_id !== 'all') {
      whereClause += ' AND o.merchant_id = ?';
      params.push(merchant_id);
    }

    // 获取销售概览数据
    const overviewSql = `
      SELECT
        SUM(o.total_amount) as total_sales,
        COUNT(DISTINCT o.id) as order_count,
        COUNT(DISTINCT o.user_id) as customer_count
      FROM orders_order o
      ${whereClause}
    `;

    // 执行查询
    const overviewResult = await query(overviewSql, params);

    // 提取结果
    const overview = overviewResult[0] || { total_sales: 0, order_count: 0, customer_count: 0 };

    // 计算客单价
    const averageOrderValue = overview.order_count > 0 ? overview.total_sales / overview.order_count : 0;

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查看销售报表概览', 'sales_report', ip]
    );

    // 返回结果
    res.json({
      total_sales: overview.total_sales || 0,
      order_count: overview.order_count || 0,
      customer_count: overview.customer_count || 0,
      average_order_value: parseFloat(averageOrderValue.toFixed(2)),
      period: {
        start_date: startDate,
        end_date: endDate,
        report_type
      }
    });
  } catch (error) {
    logger.error('获取销售报表概览失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取销售趋势数据
router.get('/trends', async (req, res) => {
  try {
    const { start_date, end_date, merchant_id, report_type = 'monthly' } = req.query;

    // 根据报表类型设置默认日期范围和间隔
    let defaultStartDate, defaultEndDate, interval;
    switch (report_type) {
      case 'daily':
        defaultStartDate = moment().subtract(1, 'days').format('YYYY-MM-DD');
        defaultEndDate = moment().format('YYYY-MM-DD');
        interval = 'hour';
        break;
      case 'weekly':
        defaultStartDate = moment().subtract(7, 'days').format('YYYY-MM-DD');
        defaultEndDate = moment().format('YYYY-MM-DD');
        interval = 'day';
        break;
      case 'yearly':
        defaultStartDate = moment().subtract(1, 'years').format('YYYY-MM-DD');
        defaultEndDate = moment().format('YYYY-MM-DD');
        interval = 'month';
        break;
      case 'monthly':
      default:
        defaultStartDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
        defaultEndDate = moment().format('YYYY-MM-DD');
        interval = 'day';
    }

    // 使用提供的日期范围或默认值
    const startDate = start_date || defaultStartDate;
    const endDate = end_date || defaultEndDate;

    // 根据间隔选择日期格式和分组
    let dateFormat, dateGroup;
    switch (interval) {
      case 'hour':
        dateFormat = '%Y-%m-%d %H:00'; // 小时格式 YYYY-MM-DD HH:00
        dateGroup = 'DATE_FORMAT(o.created_at, "%Y-%m-%d %H")';
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
      [req.user.id, 'query', '查看销售趋势数据', 'sales_report', ip]
    );

    // 返回结果
    res.json(trendsResult);
  } catch (error) {
    logger.error('获取销售趋势数据失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取商品销售排行
router.get('/product-ranking', async (req, res) => {
  try {
    const { start_date, end_date, merchant_id, limit = 10 } = req.query;

    // 设置默认日期范围为过去30天
    const defaultStartDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
    const defaultEndDate = moment().format('YYYY-MM-DD');

    // 使用提供的日期范围或默认值
    const startDate = start_date || defaultStartDate;
    const endDate = end_date || defaultEndDate;

    // 构建SQL查询条件
    let whereClause = 'WHERE o.status != "cancelled" AND o.created_at BETWEEN ? AND ?';
    let params = [startDate, endDate];

    // 如果指定了商户ID，添加过滤条件
    if (merchant_id && merchant_id !== 'all') {
      whereClause += ' AND o.merchant_id = ?';
      params.push(merchant_id);
    }

    // 获取商品销售排行数据
    const productRankingSql = `
      SELECT
        p.id,
        p.name,
        p.price,
        SUM(oi.quantity) as sales_count,
        SUM(oi.quantity * oi.price) as sales_amount
      FROM products_product p
      JOIN orders_orderitem oi ON p.id = oi.product_id
      JOIN orders_order o ON oi.order_id = o.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY sales_amount DESC
      LIMIT ?
    `;

    // 获取总销售额（用于计算占比）
    const totalSalesSql = `
      SELECT SUM(total_amount) as total_sales
      FROM orders_order o
      ${whereClause}
    `;

    // 执行查询
    params.push(parseInt(limit));
    const productRankingResult = await query(productRankingSql, params);
    const totalSalesResult = await query(totalSalesSql, params.slice(0, -1));

    // 计算销售占比
    const totalSales = totalSalesResult[0].total_sales || 0;
    const productRanking = productRankingResult.map((product, index) => {
      const salesPercentage = totalSales > 0 ? (product.sales_amount / totalSales) * 100 : 0;
      return {
        ...product,
        rank: index + 1,
        sales_percentage: parseFloat(salesPercentage.toFixed(2))
      };
    });

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查看商品销售排行', 'sales_report', ip]
    );

    // 返回结果
    res.json(productRanking);
  } catch (error) {
    logger.error('获取商品销售排行失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取分类销售分布
router.get('/category-distribution', async (req, res) => {
  try {
    const { start_date, end_date, merchant_id } = req.query;

    // 设置默认日期范围为过去30天
    const defaultStartDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
    const defaultEndDate = moment().format('YYYY-MM-DD');

    // 使用提供的日期范围或默认值
    const startDate = start_date || defaultStartDate;
    const endDate = end_date || defaultEndDate;

    // 构建SQL查询条件
    let whereClause = 'WHERE o.status != "cancelled" AND o.created_at BETWEEN ? AND ?';
    let params = [startDate, endDate];

    // 如果指定了商户ID，添加过滤条件
    if (merchant_id && merchant_id !== 'all') {
      whereClause += ' AND o.merchant_id = ?';
      params.push(merchant_id);
    }

    // 获取分类销售分布数据
    const categoryDistributionSql = `
      SELECT
        c.id,
        c.name,
        SUM(oi.quantity * oi.price) as sales_amount,
        COUNT(DISTINCT o.id) as order_count
      FROM categories_category c
      JOIN products_product p ON p.category_id = c.id
      JOIN orders_orderitem oi ON oi.product_id = p.id
      JOIN orders_order o ON oi.order_id = o.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY sales_amount DESC
    `;

    // 执行查询
    const categoryDistributionResult = await query(categoryDistributionSql, params);

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查看分类销售分布', 'sales_report', ip]
    );

    // 返回结果
    res.json(categoryDistributionResult);
  } catch (error) {
    logger.error('获取分类销售分布失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
