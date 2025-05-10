const express = require('express');
const router = express.Router();
const { query } = require('../../db');
const { authenticateToken } = require('../../utils/auth');
const logger = require('../../logger');

// 所有商户管理API都需要管理员权限
router.use(authenticateToken);

// 中间件：检查是否为超级管理员
const checkSuperAdmin = (req, res, next) => {
  // 如果用户ID为11（admin用户）或is_superuser为true，则视为超级管理员
  if (req.user.id !== 11 && req.user.username !== 'admin' && !req.user.is_superuser) {
    return res.status(403).json({ message: '权限不足，只有超级管理员可以管理商户' });
  }
  next();
};

// 获取所有商户
router.get('/', checkSuperAdmin, async (req, res) => {
  try {
    const { page = 1, page_size = 10, search } = req.query;
    const offset = (page - 1) * page_size;

    let sql = `
      SELECT id, username, email, is_active, date_joined, is_staff, is_superuser, is_merchant
      FROM user_auth_simpleuser
      WHERE is_merchant = 1
    `;
    const params = [];

    // 搜索条件
    if (search) {
      sql += ' AND (username LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // 获取总数
    const countSql = sql.replace('SELECT id, username, email, is_active, date_joined, is_staff, is_superuser, is_merchant', 'SELECT COUNT(*) as total');
    const countResult = await query(countSql, params);
    const total = countResult[0].total;

    // 分页
    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(page_size), offset);

    const merchants = await query(sql, params);

    // 记录管理员操作日志
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', '查询商户列表', 'merchant', ip]
    );

    res.json({
      total,
      page: parseInt(page),
      page_size: parseInt(page_size),
      results: merchants
    });
  } catch (error) {
    logger.error('获取商户列表失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建商户
router.post('/', checkSuperAdmin, async (req, res) => {
  try {
    const { username, password, email, is_active = 1 } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码为必填项' });
    }

    // 检查用户名是否已存在
    const existingUser = await query('SELECT * FROM user_auth_simpleuser WHERE username = ?', [username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 创建新商户
    const result = await query(
      `INSERT INTO user_auth_simpleuser
       (username, password, email, is_active, date_joined, is_staff, is_superuser, is_merchant)
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [username, password, email || '', is_active, '0', '0', 1]  // 设置为商户，但不是超级管理员
    );

    // 获取新创建的商户
    const newMerchant = await query('SELECT * FROM user_auth_simpleuser WHERE id = ?', [result.insertId]);

    // 记录管理员操作日志
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'create', `创建商户: ${username}`, 'merchant', result.insertId, ip]
    );

    res.status(201).json({
      id: newMerchant[0].id,
      username: newMerchant[0].username,
      email: newMerchant[0].email,
      is_active: newMerchant[0].is_active,
      date_joined: newMerchant[0].date_joined,
      is_merchant: newMerchant[0].is_merchant
    });
  } catch (error) {
    logger.error('创建商户失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取商户详情
router.get('/:id', checkSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const merchants = await query(
      'SELECT * FROM user_auth_simpleuser WHERE id = ? AND is_merchant = 1',
      [id]
    );

    if (merchants.length === 0) {
      return res.status(404).json({ message: '商户不存在' });
    }

    const merchant = merchants[0];

    // 记录管理员操作日志
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'query', `查询商户详情: ${merchant.username}`, 'merchant', id, ip]
    );

    res.json({
      id: merchant.id,
      username: merchant.username,
      email: merchant.email,
      is_active: merchant.is_active,
      date_joined: merchant.date_joined,
      is_merchant: merchant.is_merchant
    });
  } catch (error) {
    logger.error('获取商户详情失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新商户
router.put('/:id', checkSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, email, is_active } = req.body;

    // 验证商户是否存在
    const merchants = await query(
      'SELECT * FROM user_auth_simpleuser WHERE id = ? AND is_merchant = 1',
      [id]
    );

    if (merchants.length === 0) {
      return res.status(404).json({ message: '商户不存在' });
    }

    const merchant = merchants[0];

    // 如果要更改用户名，检查是否已存在
    if (username && username !== merchant.username) {
      const existingUser = await query('SELECT * FROM user_auth_simpleuser WHERE username = ? AND id != ?', [username, id]);
      if (existingUser.length > 0) {
        return res.status(400).json({ message: '用户名已存在' });
      }
    }

    // 构建更新SQL
    let sql = 'UPDATE user_auth_simpleuser SET ';
    const updates = [];
    const params = [];

    if (username) {
      updates.push('username = ?');
      params.push(username);
    }

    if (password) {
      updates.push('password = ?');
      params.push(password);
    }

    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: '没有提供要更新的字段' });
    }

    sql += updates.join(', ') + ' WHERE id = ?';
    params.push(id);

    await query(sql, params);

    // 获取更新后的商户
    const updatedMerchant = await query('SELECT * FROM user_auth_simpleuser WHERE id = ?', [id]);

    // 记录管理员操作日志
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'update', `更新商户: ${merchant.username}`, 'merchant', id, ip]
    );

    res.json({
      id: updatedMerchant[0].id,
      username: updatedMerchant[0].username,
      email: updatedMerchant[0].email,
      is_active: updatedMerchant[0].is_active,
      date_joined: updatedMerchant[0].date_joined,
      is_merchant: updatedMerchant[0].is_merchant
    });
  } catch (error) {
    logger.error('更新商户失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除商户
router.delete('/:id', checkSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 验证商户是否存在
    const merchants = await query(
      'SELECT * FROM user_auth_simpleuser WHERE id = ? AND is_merchant = 1',
      [id]
    );

    if (merchants.length === 0) {
      return res.status(404).json({ message: '商户不存在' });
    }

    const merchant = merchants[0];

    // 不允许删除admin账号
    if (merchant.username === 'admin') {
      return res.status(403).json({ message: '不允许删除admin账号' });
    }

    // 删除商户
    await query('DELETE FROM user_auth_simpleuser WHERE id = ?', [id]);

    // 记录管理员操作日志
    const ip = req.ip || req.socket.remoteAddress;
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, object_id, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, 'delete', `删除商户: ${merchant.username}`, 'merchant', id, ip]
    );

    res.json({ message: '商户删除成功' });
  } catch (error) {
    logger.error('删除商户失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
