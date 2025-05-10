import axios from 'axios';
import store from '@/store';

// 数据收集服务的基础URL
const ANALYTICS_BASE_URL = 'http://localhost:8000/api';

// 创建一个单独的axios实例用于数据收集
const analyticsClient = axios.create({
  baseURL: ANALYTICS_BASE_URL,
  timeout: 5000
});

// 生成简单的随机ID
function generateSimpleId() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

// 会话ID管理
let sessionId = localStorage.getItem('analytics_session_id');
if (!sessionId) {
  sessionId = generateSimpleId();
  localStorage.setItem('analytics_session_id', sessionId);
}

// 获取用户IP地址（通过多个外部服务，增加可靠性）
let userIpAddress = null;
async function getUserIp() {
  if (userIpAddress) return userIpAddress;

  // 尝试多个IP获取服务，按优先级排序
  const ipServices = [
    'https://api.ipify.org?format=json',
    'https://api.ip.sb/jsonip',
    'https://api.myip.com',
    'https://ipinfo.io/json'
  ];

  for (const service of ipServices) {
    try {
      const response = await axios.get(service, { timeout: 3000 });

      // 不同服务返回格式不同，需要适配
      if (response.data.ip) {
        userIpAddress = response.data.ip;
      } else if (response.data.YourFuckingIPAddress) {
        userIpAddress = response.data.YourFuckingIPAddress;
      } else if (response.data.query) {
        userIpAddress = response.data.query;
      }

      if (userIpAddress) {
        console.log('成功获取IP地址:', userIpAddress, '来源:', service);
        return userIpAddress;
      }
    } catch (error) {
      console.warn(`从 ${service} 获取IP地址失败:`, error.message);
      // 继续尝试下一个服务
    }
  }

  console.error('所有IP地址获取服务均失败');
  return '0.0.0.0'; // 默认值
}

// 用户登录日志
export async function logUserLogin(userId) {
  try {
    const ip = await getUserIp();
    await analyticsClient.post('/logs/users/login', {
      user_id: userId,
      ip_address: ip,
      user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error('记录用户登录失败:', error);
  }
}

// 用户登出日志
export async function logUserLogout(userId) {
  try {
    const ip = await getUserIp();
    await analyticsClient.post('/logs/users/logout', {
      user_id: userId,
      ip_address: ip,
      user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error('记录用户登出失败:', error);
  }
}

// 商品浏览日志
let currentProductView = null;
let viewStartTime = null;

export async function startProductView(productId, categoryId) {
  try {
    const ip = await getUserIp();
    const userId = (store.state.user && store.state.user.id) || null;

    // 如果已经在浏览其他商品，先结束之前的浏览
    if (currentProductView && currentProductView.product_id !== productId) {
      await endProductView();
    }

    // 记录浏览开始时间
    viewStartTime = new Date();

    // 发送浏览开始请求
    const response = await analyticsClient.post('/logs/products/view', {
      user_id: userId,
      session_id: sessionId,
      product_id: productId,
      category_id: categoryId,
      duration_seconds: 0, // 初始时长为0
      ip_address: ip
    });

    // 保存当前浏览信息
    currentProductView = {
      id: response.data.id,
      product_id: productId,
      category_id: categoryId,
      start_time: viewStartTime
    };

    return response.data.id;
  } catch (error) {
    console.error('记录商品浏览开始失败:', error);
  }
}

export async function endProductView() {
  if (!currentProductView || !viewStartTime) return;

  try {
    // 计算浏览时长（秒）
    const endTime = new Date();
    const durationSeconds = Math.round((endTime - viewStartTime) / 1000);

    // 更新浏览时长
    await analyticsClient.put(`/logs/products/view/${currentProductView.id}/duration`, {
      duration_seconds: durationSeconds
    });

    // 重置当前浏览
    currentProductView = null;
    viewStartTime = null;
  } catch (error) {
    console.error('记录商品浏览结束失败:', error);
  }
}

// 购买记录
export async function logPurchase(orderId, items) {
  try {
    const userId = (store.state.user && store.state.user.id) || null;
    if (!userId) return; // 必须是登录用户

    await analyticsClient.post('/logs/purchases/batch', {
      user_id: userId,
      order_id: orderId,
      items: items.map(function(item) {
        return {
          product_id: item.product_id,
          category_id: item.category_id,
          unit_price: item.price,
          quantity: item.quantity
        };
      })
    });
  } catch (error) {
    console.error('记录购买失败:', error);
  }
}

// 管理员操作日志
export async function logAdminOperation(adminId, operationType, content, objectType, objectId) {
  try {
    const ip = await getUserIp();
    await analyticsClient.post('/logs/admins', {
      admin_id: adminId,
      operation_type: operationType, // 'query', 'create', 'update', 'delete'
      operation_content: content,
      object_type: objectType, // 'product', 'order', 'user', etc.
      object_id: objectId,
      ip_address: ip
    });
  } catch (error) {
    console.error('记录管理员操作失败:', error);
  }
}

// 页面离开时结束当前商品浏览
window.addEventListener('beforeunload', function() {
  if (currentProductView) {
    endProductView();
  }
});

// 简单记录商品浏览（不跟踪时长）
export async function recordProductView(productId, categoryId = null) {
  try {
    const ip = await getUserIp();
    const userId = (store.state.user && store.state.user.id) || null;

    await analyticsClient.post('/logs/products/view', {
      user_id: userId,
      session_id: sessionId,
      product_id: productId,
      category_id: categoryId,
      ip_address: ip
    });

    console.log('记录商品浏览:', productId);
  } catch (error) {
    console.error('记录商品浏览失败:', error);
  }
}

export default {
  logUserLogin,
  logUserLogout,
  startProductView,
  endProductView,
  recordProductView,
  logPurchase,
  logAdminOperation
};
