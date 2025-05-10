const express = require('express');
const router = express.Router();
const { query } = require('../../db');
const { authenticateToken } = require('../../utils/auth');
const logger = require('../../logger');
const moment = require('moment');

// 所有商户分类销售业绩API都需要认证
router.use(authenticateToken);

// 获取商户分类销售业绩概览
router.get('/overview', async (req, res) => {
  try {
    const { start_date, end_date, category_id } = req.query;

    // 获取当前商户ID
    const merchantId = req.user.id;

    console.log('请求参数:', { start_date, end_date, category_id, merchantId });

    // 注意：我们已经移除了日期范围过滤，所以不再需要这些变量
    // 但为了保持代码结构，我们保留这些变量的声明，只是不再使用它们
    console.log('请求的日期范围:', { start_date, end_date });
    console.log('注意：日期范围过滤已被移除，将显示所有时间段的数据');

    // 构建SQL查询
    let overviewSql;
    let params;

    if (category_id && category_id !== 'all') {
      // 如果指定了分类ID，只查询该分类的销售概览
      overviewSql = `
        SELECT
          SUM(o.total_amount) as total_sales,
          COUNT(DISTINCT o.id) as order_count,
          COUNT(DISTINCT p.id) as product_count
        FROM orders_order o
        JOIN orders_orderitem oi ON o.id = oi.order_id
        JOIN products_product p ON oi.product_id = p.id
        WHERE o.status != "cancelled" AND p.merchant_id = ? AND p.category_id = ?
      `;
      params = [merchantId, category_id];
    } else {
      // 否则查询所有分类的销售概览
      overviewSql = `
        SELECT
          SUM(o.total_amount) as total_sales,
          COUNT(DISTINCT o.id) as order_count,
          COUNT(DISTINCT p.id) as product_count
        FROM orders_order o
        JOIN orders_orderitem oi ON o.id = oi.order_id
        JOIN products_product p ON oi.product_id = p.id
        WHERE o.status != "cancelled" AND p.merchant_id = ?
      `;
      params = [merchantId];
    }

    console.log('执行的SQL:', overviewSql);
    console.log('SQL参数:', params);

    // 执行查询
    const overviewResult = await query(overviewSql, params);

    console.log('查询结果:', overviewResult);

    // 提取结果
    const overview = overviewResult[0] || { total_sales: 0, order_count: 0, product_count: 0 };

    // 计算客单价
    const averageOrderValue = overview.order_count > 0 ? overview.total_sales / overview.order_count : 0;

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查看商户分类销售业绩概览', 'merchant_category_performance', ip]
    );

    // 返回结果
    res.json({
      total_sales: overview.total_sales || 0,
      order_count: overview.order_count || 0,
      product_count: overview.product_count || 0,
      average_order_value: parseFloat(averageOrderValue.toFixed(2)),
      period: {
        start_date: "全部",
        end_date: "全部"
      }
    });
  } catch (error) {
    logger.error('获取商户分类销售业绩概览失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取商户分类销售排行
router.get('/categories', async (req, res) => {
  try {
    const { start_date, end_date, category_id } = req.query;

    // 获取当前商户ID
    const merchantId = req.user.id;

    console.log('请求参数:', { start_date, end_date, category_id, merchantId });

    // 设置默认日期范围为过去30天
    const defaultStartDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
    const defaultEndDate = moment().format('YYYY-MM-DD');

    // 使用提供的日期范围或默认值
    const startDate = start_date || defaultStartDate;
    const endDate = end_date || defaultEndDate;

    // 获取指定分类的基本信息
    let categoryInfo = null;

    if (category_id && category_id !== 'all') {
      const categoryQuery = await query(
        'SELECT * FROM categories_category WHERE id = ?',
        [category_id]
      );

      if (categoryQuery.length > 0) {
        categoryInfo = categoryQuery[0];
        console.log('找到分类信息:', categoryInfo);
      } else {
        console.log('未找到分类信息，ID:', category_id);
      }
    }

    // 构建SQL查询
    let categoriesSql;
    let params;

    if (category_id && category_id !== 'all') {
      // 如果指定了分类ID，只查询该分类的销售数据
      categoriesSql = `
        SELECT
          c.id,
          c.name,
          IFNULL(SUM(oi.quantity * oi.price), 0) as sales_amount,
          COUNT(DISTINCT o.id) as order_count,
          COUNT(DISTINCT p.id) as product_count
        FROM categories_category c
        LEFT JOIN products_product p ON p.category_id = c.id AND p.merchant_id = ?
        LEFT JOIN orders_orderitem oi ON oi.product_id = p.id
        LEFT JOIN orders_order o ON oi.order_id = o.id AND o.status != "cancelled" AND o.created_at BETWEEN ? AND ?
        WHERE c.id = ?
        GROUP BY c.id
      `;
      params = [merchantId, startDate, endDate, category_id];
    } else {
      // 否则查询所有分类的销售数据
      categoriesSql = `
        SELECT
          c.id,
          c.name,
          IFNULL(SUM(oi.quantity * oi.price), 0) as sales_amount,
          COUNT(DISTINCT o.id) as order_count,
          COUNT(DISTINCT p.id) as product_count
        FROM categories_category c
        LEFT JOIN products_product p ON p.category_id = c.id AND p.merchant_id = ?
        LEFT JOIN orders_orderitem oi ON oi.product_id = p.id
        LEFT JOIN orders_order o ON oi.order_id = o.id AND o.status != "cancelled" AND o.created_at BETWEEN ? AND ?
        WHERE c.merchant_id = ?
        GROUP BY c.id
        ORDER BY sales_amount DESC
      `;
      params = [merchantId, startDate, endDate, merchantId];
    }

    console.log('执行的SQL:', categoriesSql);
    console.log('SQL参数:', params);

    // 执行查询
    const categoriesResult = await query(categoriesSql, params);

    console.log('查询结果:', categoriesResult);

    // 如果是单个分类查询，但没有销售数据，返回基本信息
    if (category_id && category_id !== 'all' && categoriesResult.length === 0 && categoryInfo) {
      categoriesResult.push({
        id: categoryInfo.id,
        name: categoryInfo.name,
        sales_amount: 0,
        order_count: 0,
        product_count: 0
      });
      console.log('添加了基本分类信息:', categoriesResult);
    }

    // 计算销售占比
    const totalSales = categoriesResult.reduce((sum, category) => sum + (category.sales_amount || 0), 0);
    const categories = categoriesResult.map(category => {
      const salesPercentage = totalSales > 0 ? (category.sales_amount / totalSales) * 100 : 0;
      return {
        ...category,
        sales_percentage: parseFloat(salesPercentage.toFixed(2))
      };
    });

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查看商户分类销售排行', 'merchant_category_performance', ip]
    );

    // 返回结果
    res.json(categories);
  } catch (error) {
    console.error('获取商户分类销售排行失败:', error);
    logger.error('获取商户分类销售排行失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取商户商品销售排行
router.get('/products', async (req, res) => {
  try {
    const { start_date, end_date, category_id, limit = 10 } = req.query;

    // 获取当前商户ID
    const merchantId = req.user.id;

    console.log('请求参数:', { start_date, end_date, category_id, limit, merchantId });

    // 设置默认日期范围为过去30天
    const defaultStartDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
    const defaultEndDate = moment().format('YYYY-MM-DD');

    // 使用提供的日期范围或默认值
    const startDate = start_date || defaultStartDate;
    const endDate = end_date || defaultEndDate;

    // 构建SQL查询
    let productsSql;
    let params;

    if (category_id && category_id !== 'all') {
      // 如果指定了分类ID，只查询该分类的商品销售数据
      productsSql = `
        SELECT
          p.id,
          p.name,
          c.name as category_name,
          p.price,
          IFNULL(SUM(oi.quantity), 0) as sales_count,
          IFNULL(SUM(oi.quantity * oi.price), 0) as sales_amount
        FROM products_product p
        JOIN categories_category c ON p.category_id = c.id
        LEFT JOIN orders_orderitem oi ON oi.product_id = p.id
        LEFT JOIN orders_order o ON oi.order_id = o.id AND o.status != "cancelled"
        WHERE p.merchant_id = ? AND p.category_id = ?
        GROUP BY p.id
        ORDER BY sales_amount DESC
        LIMIT ?
      `;
      params = [startDate, endDate, merchantId, category_id, parseInt(limit)];
    } else {
      // 否则查询所有商品的销售数据
      productsSql = `
        SELECT
          p.id,
          p.name,
          c.name as category_name,
          p.price,
          IFNULL(SUM(oi.quantity), 0) as sales_count,
          IFNULL(SUM(oi.quantity * oi.price), 0) as sales_amount
        FROM products_product p
        JOIN categories_category c ON p.category_id = c.id
        LEFT JOIN orders_orderitem oi ON oi.product_id = p.id
        LEFT JOIN orders_order o ON oi.order_id = o.id AND o.status != "cancelled" AND o.created_at BETWEEN ? AND ?
        WHERE p.merchant_id = ?
        GROUP BY p.id
        ORDER BY sales_amount DESC
        LIMIT ?
      `;
      params = [startDate, endDate, merchantId, parseInt(limit)];
    }

    console.log('执行的SQL:', productsSql);
    console.log('SQL参数:', params);

    // 执行查询
    const productsResult = await query(productsSql, params);

    console.log('查询结果:', productsResult);

    // 计算销售占比
    const totalSales = productsResult.reduce((sum, product) => sum + (product.sales_amount || 0), 0);
    const products = productsResult.map(product => {
      const salesPercentage = totalSales > 0 ? (product.sales_amount / totalSales) * 100 : 0;
      return {
        ...product,
        sales_percentage: parseFloat(salesPercentage.toFixed(2))
      };
    });

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查看商户商品销售排行', 'merchant_category_performance', ip]
    );

    // 返回结果
    res.json(products);
  } catch (error) {
    logger.error('获取商户商品销售排行失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 获取商户销售趋势
router.get('/trends', async (req, res) => {
  try {
    const { start_date, end_date, category_id } = req.query;

    // 获取当前商户ID
    const merchantId = req.user.id;

    console.log('请求参数:', { start_date, end_date, category_id, merchantId });

    // 注意：我们已经移除了日期范围过滤，所以不再需要这些变量
    // 但为了保持代码结构，我们保留这些变量的声明，只是不再使用它们
    console.log('请求的日期范围:', { start_date, end_date });
    console.log('注意：日期范围过滤已被移除，将显示所有时间段的数据');

    // 构建SQL查询
    let trendsSql;
    let params;

    if (category_id && category_id !== 'all') {
      // 如果指定了分类ID，只查询该分类的销售趋势
      trendsSql = `
        SELECT
          DATE(o.created_at) as date,
          SUM(o.total_amount) as sales_amount,
          COUNT(DISTINCT o.id) as order_count
        FROM orders_order o
        JOIN orders_orderitem oi ON o.id = oi.order_id
        JOIN products_product p ON oi.product_id = p.id
        WHERE o.status != "cancelled" AND p.merchant_id = ? AND p.category_id = ?
        GROUP BY DATE(o.created_at)
        ORDER BY date
      `;
      params = [merchantId, category_id];
    } else {
      // 否则查询所有分类的销售趋势
      trendsSql = `
        SELECT
          DATE(o.created_at) as date,
          SUM(o.total_amount) as sales_amount,
          COUNT(DISTINCT o.id) as order_count
        FROM orders_order o
        JOIN orders_orderitem oi ON o.id = oi.order_id
        JOIN products_product p ON oi.product_id = p.id
        WHERE o.status != "cancelled" AND p.merchant_id = ?
        GROUP BY DATE(o.created_at)
        ORDER BY date
      `;
      params = [merchantId];
    }

    console.log('执行的SQL:', trendsSql);
    console.log('SQL参数:', params);

    // 执行查询
    const trendsResult = await query(trendsSql, params);

    console.log('查询结果:', trendsResult);

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查看商户销售趋势', 'merchant_category_performance', ip]
    );

    // 返回结果
    res.json(trendsResult);
  } catch (error) {
    logger.error('获取商户销售趋势失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
