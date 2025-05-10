const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../../utils/auth');
const logger = require('../../logger');

// 导入管理员路由
const ordersRouter = require('./orders');
const categoriesRouter = require('./categories');
const usersRouter = require('./users');
const merchantsRouter = require('./merchants');
const salesLogsRouter = require('./sales-logs');
const inventoryRouter = require('./inventory');
const salesPerformanceRouter = require('./sales-performance');
const salesReportRouter = require('./sales-report');
const merchantSalesLogsRouter = require('./merchant-sales-logs');
const merchantCategoryPerformanceRouter = require('./merchant-category-performance');
const merchantInventoryRouter = require('./merchant-inventory');
const merchantCategoriesRouter = require('./merchant-categories');

// 管理员路由
router.use('/orders', ordersRouter);
router.use('/categories', categoriesRouter);
router.use('/users', usersRouter);
router.use('/merchants', merchantsRouter);
router.use('/sales-logs', salesLogsRouter);
router.use('/inventory', inventoryRouter);
router.use('/sales-performance', salesPerformanceRouter);
router.use('/sales-report', salesReportRouter);
router.use('/merchant-sales-logs', merchantSalesLogsRouter);
router.use('/merchant-category-performance', merchantCategoryPerformanceRouter);
router.use('/merchant-inventory', merchantInventoryRouter);
router.use('/merchant-categories', merchantCategoriesRouter);

// 管理员仪表盘数据
router.get('/dashboard', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { query } = require('../../db');

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

    // 获取订单状态统计
    const orderStatusResult = await query(
      'SELECT status, COUNT(*) as count FROM orders_order GROUP BY status'
    );

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查看管理员仪表盘', 'dashboard', ip]
    );

    res.json({
      user_count: userCount,
      order_count: orderCount,
      product_count: productCount,
      category_count: categoryCount,
      total_sales: totalSales,
      today_orders: todayOrders,
      today_sales: todaySales,
      last_7_days_orders: last7DaysOrdersResult,
      recent_orders: recentOrdersResult,
      recent_users: recentUsersResult,
      order_status: orderStatusResult
    });
  } catch (error) {
    logger.error('获取管理员仪表盘数据失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
