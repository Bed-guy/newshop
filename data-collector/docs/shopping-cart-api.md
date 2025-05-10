# 新版购物车API接口文档

## 认证

所有购物车API都需要用户认证。请在请求头中添加以下字段：

```
Authorization: Bearer <your-token>
```

其中 `<your-token>` 是用户登录后获取的令牌。

## API端点

### 1. 获取购物车

获取当前用户的购物车信息，包括购物车中的商品列表和总价。

**请求**

```
GET /api/shopping-cart/
```

**响应**

成功响应 (200 OK):

```json
{
  "items": [
    {
      "id": 1,
      "product_id": 2,
      "quantity": 3,
      "name": "商品名称",
      "price": 99.99,
      "image_url": "https://example.com/image.jpg",
      "stock": 100,
      "category_name": "分类名称",
      "total_item_price": 299.97
    }
  ],
  "total_price": "299.97"
}
```

### 2. 添加商品到购物车

将商品添加到购物车，如果购物车中已有该商品，则增加数量。

**请求**

```
POST /api/shopping-cart/add
```

请求体:

```json
{
  "product_id": 2,
  "quantity": 3
}
```

**响应**

成功响应 (201 Created):

```json
{
  "id": 1,
  "product_id": 2,
  "quantity": 3,
  "name": "商品名称",
  "price": 99.99,
  "image_url": "https://example.com/image.jpg",
  "stock": 100,
  "total_item_price": 299.97
}
```

### 3. 更新购物车商品数量

更新购物车中商品的数量。

**请求**

```
PUT /api/shopping-cart/:id
```

其中 `:id` 是购物车商品的ID。

请求体:

```json
{
  "quantity": 5
}
```

**响应**

成功响应 (200 OK):

```json
{
  "id": 1,
  "product_id": 2,
  "quantity": 5,
  "name": "商品名称",
  "price": 99.99,
  "image_url": "https://example.com/image.jpg",
  "stock": 100,
  "total_item_price": 499.95
}
```

### 4. 删除购物车商品

从购物车中删除商品。

**请求**

```
DELETE /api/shopping-cart/:id
```

其中 `:id` 是购物车商品的ID。

**响应**

成功响应 (200 OK):

```json
{
  "message": "购物车商品已删除"
}
```

### 5. 清空购物车

清空购物车中的所有商品。

**请求**

```
DELETE /api/shopping-cart/
```

**响应**

成功响应 (200 OK):

```json
{
  "message": "购物车已清空"
}
```

## 兼容旧API

为了兼容旧的前端代码，我们也提供了以下兼容API：

### 获取购物车（兼容旧API）

```
GET /myapp/index/cart/list
```

### 添加商品到购物车（兼容旧API）

```
POST /myapp/index/cart/add
```

## 错误响应

所有API可能返回以下错误响应：

- 400 Bad Request: 请求参数错误
- 401 Unauthorized: 未提供认证令牌或令牌无效
- 404 Not Found: 资源不存在
- 500 Internal Server Error: 服务器内部错误

错误响应格式:

```json
{
  "message": "错误信息"
}
```

## 前端集成示例

### 1. 安装依赖

```bash
npm install axios
```

### 2. 创建API请求函数

```javascript
// api/shopping-cart.js
import request from '@/utils/request';

export function getShoppingCart() {
  return request({
    url: '/api/shopping-cart',
    method: 'get'
  });
}

export function addToCart(data) {
  return request({
    url: '/api/shopping-cart/add',
    method: 'post',
    data
  });
}

export function updateCartItem(id, data) {
  return request({
    url: `/api/shopping-cart/${id}`,
    method: 'put',
    data
  });
}

export function removeCartItem(id) {
  return request({
    url: `/api/shopping-cart/${id}`,
    method: 'delete'
  });
}

export function clearCart() {
  return request({
    url: '/api/shopping-cart',
    method: 'delete'
  });
}
```

### 3. 在组件中使用

```javascript
// 获取购物车
async fetchCart() {
  try {
    const response = await getShoppingCart();
    this.cartItems = response.items || [];
    this.totalPrice = response.total_price;
  } catch (error) {
    console.error('获取购物车失败:', error);
  }
}

// 添加商品到购物车
async addToCart(productId, quantity) {
  try {
    await addToCart({ product_id: productId, quantity });
    this.$message.success('商品已添加到购物车');
  } catch (error) {
    console.error('添加到购物车失败:', error);
  }
}
```
