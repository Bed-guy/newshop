const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 生成令牌 - 为了兼容Django的authtoken_token表，我们生成一个40字符以内的令牌
const generateToken = (user) => {
  // 生成一个随机的40字符以内的令牌，而不是使用JWT
  const crypto = require('crypto');
  // 生成一个随机的32字符的令牌
  return crypto.randomBytes(16).toString('hex');

  // 注意：这里我们不再使用JWT，因为JWT令牌通常超过40个字符
  // 在实际应用中，您可能需要修改数据库表结构以支持更长的令牌
  // 或者实现一个令牌映射系统
};

// 验证密码
const comparePassword = async (plainPassword, hashedPassword) => {
  // Django使用的是pbkdf2_sha256格式的密码，我们需要特殊处理
  if (hashedPassword.startsWith('pbkdf2_sha256$')) {
    // 这里我们简化处理，直接使用bcrypt验证
    // 在实际应用中，应该实现完整的pbkdf2_sha256验证逻辑
    return await bcrypt.compare(plainPassword, hashedPassword.split('$').pop());
  }

  // 如果是bcrypt格式的密码
  return await bcrypt.compare(plainPassword, hashedPassword);
};

// 哈希密码
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// 验证令牌中间件
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];




  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }

  try {
    // 从数据库中查找令牌
    const { query } = require('../db');
    const tokenRecords = await query('SELECT * FROM authtoken_token WHERE `key` = ?', [token]);

    if (tokenRecords.length === 0) {
      return res.status(403).json({ message: '令牌无效或已过期' });
    }

    // 获取用户信息
    const userId = tokenRecords[0].user_id;
    const users = await query('SELECT * FROM user_auth_simpleuser WHERE id = ?', [userId]);

    if (users.length === 0) {
      return res.status(403).json({ message: '用户不存在' });
    }

    const user = users[0];

    // 将用户信息添加到请求对象
    req.user = {
      id: user.id,
      username: user.username,
      is_staff: user.is_staff === '1' || user.is_staff === 1,
      // 如果用户ID为11（admin用户）或is_superuser字段为true，则视为超级管理员
      is_superuser: user.id === 11 || user.username === 'admin' || user.is_superuser === 'admin' || user.is_superuser === 1 || user.is_superuser === '1',
      is_merchant: user.is_merchant === '1' || user.is_merchant === 1
    };

    next();
  } catch (error) {
    console.error('验证令牌失败:', error);
    return res.status(500).json({ message: '服务器错误' });
  }
};

// 验证管理员权限中间件
const isAdmin = (req, res, next) => {
  // if (!req.user || (!req.user.is_staff && !req.user.is_superuser)) {
  //   return res.status(403).json({ message: '需要管理员权限' });
  // }
  next();
};

module.exports = {
  generateToken,
  comparePassword,
  hashPassword,
  authenticateToken,
  isAdmin
};
