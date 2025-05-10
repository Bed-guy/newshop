const mysql = require('mysql2/promise');
require('dotenv').config();

// 创建数据库连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return false;
  }
}

// 初始化数据库表
async function initDatabase() {
  try {
    const connection = await pool.getConnection();

    // 创建用户登录日志表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_login_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action ENUM('login', 'logout') NOT NULL,
        ip_address VARCHAR(50) NOT NULL,
        timestamp DATETIME NOT NULL,
        user_agent TEXT,
        INDEX (user_id),
        INDEX (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建商品浏览日志表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_view_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        session_id VARCHAR(100) NOT NULL,
        product_id INT NOT NULL,
        category_id INT NULL,
        view_time DATETIME NOT NULL,
        duration_seconds INT DEFAULT 0,
        ip_address VARCHAR(50) NOT NULL,
        INDEX (user_id),
        INDEX (product_id),
        INDEX (category_id),
        INDEX (view_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建购买记录表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS purchase_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        category_id INT NULL,
        purchase_date DATETIME NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        quantity INT NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        order_id INT NULL,
        INDEX (user_id),
        INDEX (product_id),
        INDEX (purchase_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建管理员操作日志表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_operation_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        operation_type ENUM('query', 'create', 'update', 'delete') NOT NULL,
        operation_content TEXT NOT NULL,
        object_type VARCHAR(50) NOT NULL,
        object_id INT NULL,
        ip_address VARCHAR(50) NOT NULL,
        timestamp DATETIME NOT NULL,
        INDEX (admin_id),
        INDEX (operation_type),
        INDEX (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建用户收藏表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_wish_list (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        created_at DATETIME NOT NULL,
        INDEX (user_id),
        INDEX (product_id),
        UNIQUE KEY user_product (user_id, product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建用户收藏夹表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_collection (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        created_at DATETIME NOT NULL,
        INDEX (user_id),
        INDEX (product_id),
        UNIQUE KEY user_product (user_id, product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建新的购物车表 - 直接关联用户和商品
    await connection.query(`
      DROP TABLE IF EXISTS cart_cartitem;
    `);

    await connection.query(`
      DROP TABLE IF EXISTS cart_cart;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS shopping_cart (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        INDEX (user_id),
        INDEX (product_id),
        UNIQUE KEY user_product (user_id, product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 创建支付日志表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payment_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        order_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        ip_address VARCHAR(50) NOT NULL,
        timestamp DATETIME NOT NULL,
        INDEX (user_id),
        INDEX (order_id),
        INDEX (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 修改订单表，添加支付方式和支付时间字段
    try {
      // 检查订单表是否存在payment_method列
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'django_shopping'
        AND TABLE_NAME = 'orders_order'
        AND COLUMN_NAME = 'payment_method'
      `);

      // 如果不存在，添加payment_method和payment_time列
      if (columns.length === 0) {
        await connection.query(`
          ALTER TABLE orders_order
          ADD COLUMN payment_method VARCHAR(50) NULL,
          ADD COLUMN payment_time DATETIME NULL
        `);
        console.log('订单表添加支付方式和支付时间字段成功');
      }
    } catch (error) {
      console.error('修改订单表失败:', error);
    }

    connection.release();
    console.log('数据库表初始化成功');
  } catch (error) {
    console.error('数据库表初始化失败:', error);
  }
}

// 执行SQL查询的辅助函数
async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('SQL查询错误:', error);
    throw error;
  }
}

// 获取数据库连接的辅助函数
async function getConnection() {
  return await pool.getConnection();
}

module.exports = {
  pool,
  query,
  testConnection,
  initDatabase,
  getConnection
};
