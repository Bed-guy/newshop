const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { generateToken, comparePassword, hashPassword } = require('../utils/auth');
const logger = require('../logger');

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码为必填项' });
    }

    // 检查用户名是否已存在
    const existingUser = await query('SELECT * FROM user_auth_simpleuser WHERE username = ?', [username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 创建新用户
    const result = await query(
      `INSERT INTO user_auth_simpleuser
       (username, password, email, is_active, date_joined, is_staff, is_superuser, is_merchant)
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [username, password, email || '', 1, '0', '0', 1]  // 默认设置为商户，但不是超级管理员
    );

    // 获取新创建的用户
    const newUser = await query('SELECT * FROM user_auth_simpleuser WHERE id = ?', [result.insertId]);

    // 生成令牌
    const token = generateToken(newUser[0]);

    // 创建令牌记录
    await query(
      "INSERT INTO authtoken_token (`key`, created, user_id) VALUES (?, NOW(), ?)",
      [token, newUser[0].id]
    );

    // 记录用户注册日志
    logger.info(`用户注册成功: ${username}`);

    res.status(201).json({
      token: token,
      user: {
        id: newUser[0].id,
        username: newUser[0].username,
        email: newUser[0].email,
        is_active: newUser[0].is_active,
        date_joined: newUser[0].date_joined
      }
    });
  } catch (error) {
    logger.error('用户注册失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码为必填项' });
    }

    // 查找用户
    const users = await query('SELECT * FROM user_auth_simpleuser WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }

    const user = users[0];

    // 验证密码
    // 注意：这里简化了密码验证，实际应该实现完整的Django密码验证逻辑
    if (user.password !== password) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }

    // 生成令牌
    const token = generateToken(user);

    // 更新或创建令牌记录
    const existingToken = await query('SELECT * FROM authtoken_token WHERE user_id = ?', [user.id]);
    if (existingToken.length > 0) {
      await query('UPDATE authtoken_token SET `key` = ?, created = NOW() WHERE user_id = ?', [token, user.id]);
    } else {
      await query('INSERT INTO authtoken_token (`key`, created, user_id) VALUES (?, NOW(), ?)', [token, user.id]);
    }

    // 记录用户登录日志
    const ip = req.ip || req.connection.remoteAddress;
    await query(
      'INSERT INTO user_login_logs (user_id, action, ip_address, timestamp, user_agent) VALUES (?, ?, ?, NOW(), ?)',
      [user.id, 'login', ip, req.get('User-Agent')]
    );

    logger.info(`用户登录成功: ${username}`);

    res.json({
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_active: user.is_active,
        date_joined: user.date_joined,
        is_superuser: user.is_superuser === '1' || user.is_superuser === 1 || user.is_superuser === 'admin'
      }
    });
  } catch (error) {
    logger.error('用户登录失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 管理员登录
router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码为必填项' });
    }

    // 查找用户
    const users = await query('SELECT * FROM user_auth_simpleuser WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }

    const user = users[0];

    // 验证密码
    if (user.password !== password) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }

    // 验证是否为商户或管理员
    if (!user.is_merchant && user.username !== 'admin' && !user.is_superuser) {
      return res.status(403).json({ message: '权限不足，只有商户或管理员账户可登录管理后台' });
    }

    // 生成令牌
    const token = generateToken(user);

    // 更新或创建令牌记录
    const existingToken = await query('SELECT * FROM authtoken_token WHERE user_id = ?', [user.id]);
    if (existingToken.length > 0) {
      await query('UPDATE authtoken_token SET `key` = ?, created = NOW() WHERE user_id = ?', [token, user.id]);
    } else {
      await query('INSERT INTO authtoken_token (`key`, created, user_id) VALUES (?, NOW(), ?)', [token, user.id]);
    }

    // 记录管理员登录日志
    const ip = req.ip || req.connection.remoteAddress;
    await query(
      'INSERT INTO user_login_logs (user_id, action, ip_address, timestamp, user_agent) VALUES (?, ?, ?, NOW(), ?)',
      [user.id, 'login', ip, req.get('User-Agent')]
    );

    // 记录管理员操作日志
    await query(
      `INSERT INTO admin_operation_logs
       (admin_id, operation_type, operation_content, object_type, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [user.id, 'query', '管理员登录', 'user', ip]
    );

    logger.info(`管理员登录成功: ${username}`);

    res.json({
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_active: user.is_active,
        date_joined: user.date_joined,
        is_superuser: user.is_superuser === '1' || user.is_superuser === 1 || user.is_superuser === 'admin',
        is_merchant: user.is_merchant === '1' || user.is_merchant === 1
      },
      is_admin: true
    });
  } catch (error) {
    logger.error('管理员登录失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

// 用户登出
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(400).json({ message: '未提供令牌' });
    }

    // 查找令牌对应的用户
    const tokenRecords = await query('SELECT * FROM authtoken_token WHERE `key` = ?', [token]);
    if (tokenRecords.length === 0) {
      return res.status(400).json({ message: '无效的令牌' });
    }

    const userId = tokenRecords[0].user_id;

    // 记录用户登出日志
    const ip = req.ip || req.connection.remoteAddress;
    await query(
      'INSERT INTO user_login_logs (user_id, action, ip_address, timestamp, user_agent) VALUES (?, ?, ?, NOW(), ?)',
      [userId, 'logout', ip, req.get('User-Agent')]
    );

    // 可选：删除令牌
    // await query('DELETE FROM authtoken_token WHERE `key` = ?', [token]);

    logger.info(`用户登出成功: ID=${userId}`);

    res.json({ message: '登出成功' });
  } catch (error) {
    logger.error('用户登出失败', { error: error.message, stack: error.stack });
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
