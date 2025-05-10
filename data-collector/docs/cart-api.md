# 购物车API接口文档

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
GET /api/cart/
```

**响应**

成功响应 (200 OK):

```json
{
  "id": 1,
  "items": [
    {
      "id": 1,
      "cart_id": 1,
      "product_id": 2,
      "quantity": 3,
      "name": "商品名称",
      "price": 99.99,
      "image_url": "https://example.com/image.jpg",
      "category_name": "分类名称"
    }
  ],
  "total_price": 299.97
}
```

### 2. 添加商品到购物车

将商品添加到购物车，如果购物车中已有该商品，则增加数量。

**请求**

```
POST /api/cart/items
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
  "cart_id": 1,
  "product_id": 2,
  "quantity": 3,
  "name": "商品名称",
  "price": 99.99,
  "image_url": "https://example.com/image.jpg"
}
```

### 3. 更新购物车商品数量

更新购物车中商品的数量。

**请求**

```
PUT /api/cart/items/:id
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
  "cart_id": 1,
  "product_id": 2,
  "quantity": 5,
  "name": "商品名称",
  "price": 99.99,
  "image_url": "https://example.com/image.jpg"
}
```

### 4. 删除购物车商品

从购物车中删除商品。

**请求**

```
DELETE /api/cart/items/:id
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
DELETE /api/cart/
```

**响应**

成功响应 (200 OK):

```json
{
  "message": "购物车已清空"
}
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

## 示例

### 添加商品到购物车

```javascript
// 使用fetch API
fetch('/api/cart/items', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    product_id: 2,
    quantity: 3
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

### 获取购物车

```javascript
// 使用fetch API
fetch('/api/cart/', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```
