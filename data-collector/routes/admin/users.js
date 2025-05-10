const express = require('express');
const router = express.Router();
const { query, pool } = require('../../db');
const { authenticateToken, isAdmin } = require('../../utils/auth');
const logger = require('../../logger');
const crypto = require('crypto'); // 使用 Node.js 内置的 crypto 模块

// 简单的密码加密函数
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 获取所有用户（管理员）
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { username, email, is_staff, is_active, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

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
    params.push(parseInt(limit), parseInt(offset));

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

    // 获取每个用户的订单数量
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const orderCountResult = await query(
        'SELECT COUNT(*) as count FROM orders_order WHERE user_id = ?',
        [user.id]
      );

      return {
        ...user,
        order_count: orderCountResult[0].count
      };
    }));

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查询用户列表', 'user', ip]
    );

    res.json({
      items: usersWithStats,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('获取用户列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取用户详情（管理员）
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    const users = await query(
      'SELECT id, username, email, first_name, last_name, is_staff, is_superuser, is_active, date_joined, last_login FROM user_auth_simpleuser WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 获取用户订单数量
    const orderCountResult = await query(
      'SELECT COUNT(*) as count FROM orders_order WHERE user_id = ?',
      [userId]
    );

    // 获取用户最近的订单
    const recentOrders = await query(
      'SELECT * FROM orders_order WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
      [userId]
    );

    // 获取用户登录日志
    const loginLogs = await query(
      'SELECT * FROM user_login_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10',
      [userId]
    );

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', `查看用户详情: ID=${userId}`, 'user', userId, ip]
    );

    res.json({
      ...users[0],
      order_count: orderCountResult[0].count,
      recent_orders: recentOrders,
      login_logs: loginLogs
    });
  } catch (error) {
    logger.error('获取用户详情失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建用户（管理员）
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, is_staff, is_superuser, is_active } = req.body;

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({ message: '用户名、邮箱和密码为必填项' });
    }

    // 检查用户名是否已存在
    const existingUsers = await query(
      'SELECT * FROM user_auth_simpleuser WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 检查邮箱是否已存在
    const existingEmails = await query(
      'SELECT * FROM user_auth_simpleuser WHERE email = ?',
      [email]
    );

    if (existingEmails.length > 0) {
      return res.status(400).json({ message: '邮箱已存在' });
    }

    // 加密密码
    const hashedPassword = hashPassword(password);

    // 创建用户
    const result = await query(
      `INSERT INTO user_auth_simpleuser
       (username, email, password, first_name, last_name, is_staff, is_superuser, is_active, date_joined)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        username,
        email,
        hashedPassword,
        first_name || '',
        last_name || '',
        is_staff ? 1 : 0,
        is_superuser ? 1 : 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1
      ]
    );

    const userId = result.insertId;

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'create', `创建用户: ${username}`, 'user', userId, ip]
    );

    // 获取创建的用户
    const users = await query(
      'SELECT id, username, email, first_name, last_name, is_staff, is_superuser, is_active, date_joined, last_login FROM user_auth_simpleuser WHERE id = ?',
      [userId]
    );

    logger.info(`管理员创建用户: ID=${userId}, 用户名=${username}`);

    res.status(201).json(users[0]);
  } catch (error) {
    logger.error('创建用户失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新用户（管理员）
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, email, password, first_name, last_name, is_staff, is_superuser, is_active } = req.body;

    // 验证用户是否存在
    const users = await query(
      'SELECT * FROM user_auth_simpleuser WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 检查用户名是否已存在（排除当前用户）
    if (username) {
      const existingUsers = await query(
        'SELECT * FROM user_auth_simpleuser WHERE username = ? AND id != ?',
        [username, userId]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ message: '用户名已存在' });
      }
    }

    // 检查邮箱是否已存在（排除当前用户）
    if (email) {
      const existingEmails = await query(
        'SELECT * FROM user_auth_simpleuser WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (existingEmails.length > 0) {
        return res.status(400).json({ message: '邮箱已存在' });
      }
    }

    // 构建更新SQL
    let updateSql = 'UPDATE user_auth_simpleuser SET ';
    const updateParams = [];
    const updateFields = [];

    if (username) {
      updateFields.push('username = ?');
      updateParams.push(username);
    }

    if (email) {
      updateFields.push('email = ?');
      updateParams.push(email);
    }

    if (password) {
      const hashedPassword = hashPassword(password);
      updateFields.push('password = ?');
      updateParams.push(hashedPassword);
    }

    if (first_name !== undefined) {
      updateFields.push('first_name = ?');
      updateParams.push(first_name);
    }

    if (last_name !== undefined) {
      updateFields.push('last_name = ?');
      updateParams.push(last_name);
    }

    if (is_staff !== undefined) {
      updateFields.push('is_staff = ?');
      updateParams.push(is_staff ? 1 : 0);
    }

    if (is_superuser !== undefined) {
      updateFields.push('is_superuser = ?');
      updateParams.push(is_superuser ? 1 : 0);
    }

    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateParams.push(is_active ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: '没有提供要更新的字段' });
    }

    updateSql += updateFields.join(', ');
    updateSql += ' WHERE id = ?';
    updateParams.push(userId);

    // 更新用户
    await query(updateSql, updateParams);

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'update', `更新用户: ID=${userId}`, 'user', userId, ip]
    );

    // 获取更新后的用户
    const updatedUsers = await query(
      'SELECT id, username, email, first_name, last_name, is_staff, is_superuser, is_active, date_joined, last_login FROM user_auth_simpleuser WHERE id = ?',
      [userId]
    );

    logger.info(`管理员更新用户: ID=${userId}`);

    res.json(updatedUsers[0]);
  } catch (error) {
    logger.error('更新用户失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除用户（管理员）
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const userId = req.params.id;

    // 验证用户是否存在
    const [users] = await connection.query(
      'SELECT * FROM user_auth_simpleuser WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: '用户不存在' });
    }

    // 检查是否是超级管理员
    if (users[0].is_superuser) {
      await connection.rollback();
      return res.status(400).json({ message: '无法删除超级管理员' });
    }

    // 检查是否是当前用户
    if (userId == req.user.id) {
      await connection.rollback();
      return res.status(400).json({ message: '无法删除当前登录用户' });
    }

    // 删除用户的令牌
    await connection.query(
      'DELETE FROM authtoken_token WHERE user_id = ?',
      [userId]
    );

    // 删除用户的购物车
    await connection.query(
      'DELETE FROM shopping_cart WHERE user_id = ?',
      [userId]
    );

    // 删除用户的收藏
    await connection.query(
      'DELETE FROM user_wish_list WHERE user_id = ?',
      [userId]
    );

    await connection.query(
      'DELETE FROM user_collection WHERE user_id = ?',
      [userId]
    );

    // 删除用户的登录日志
    await connection.query(
      'DELETE FROM user_login_logs WHERE user_id = ?',
      [userId]
    );

    // 删除用户
    await connection.query(
      'DELETE FROM user_auth_simpleuser WHERE id = ?',
      [userId]
    );

    // 记录管理员操作
    const ip = req.ip || req.socket.remoteAddress;
    await connection.query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'delete', `删除用户: ID=${userId}, 用户名=${users[0].username}`, 'user', userId, ip]
    );

    await connection.commit();

    logger.info(`管理员删除用户: ID=${userId}, 用户名=${users[0].username}`);

    res.json({ message: '用户已删除' });
  } catch (error) {
    await connection.rollback();
    logger.error('删除用户失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  } finally {
    connection.release();
  }
});

module.exports = router;
