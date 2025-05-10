<template>
  <div class="shopping-cart">
    <div class="cart-header">
      <h2>购物车</h2>
      <a-button type="link" @click="clearCart" v-if="cartItems.length > 0">清空购物车</a-button>
    </div>
    
    <div v-if="loading" class="loading-container">
      <a-spin />
    </div>
    
    <div v-else-if="cartItems.length === 0" class="empty-cart">
      <a-empty description="购物车为空" />
      <a-button type="primary" @click="$router.push('/')">去购物</a-button>
    </div>
    
    <div v-else class="cart-items">
      <div class="cart-item" v-for="item in cartItems" :key="item.id">
        <div class="item-image">
          <img :src="item.image_url || defaultImage" :alt="item.name" />
        </div>
        
        <div class="item-details">
          <h3 class="item-name">{{ item.name }}</h3>
          <p class="item-price">¥{{ item.price.toFixed(2) }}</p>
        </div>
        
        <div class="item-quantity">
          <a-input-number 
            v-model="item.quantity" 
            :min="1" 
            :max="item.stock" 
            @change="value => updateQuantity(item.id, value)" 
          />
        </div>
        
        <div class="item-total">
          <p>¥{{ (item.price * item.quantity).toFixed(2) }}</p>
        </div>
        
        <div class="item-actions">
          <a-button type="link" icon="delete" @click="removeItem(item.id)" />
        </div>
      </div>
      
      <div class="cart-footer">
        <div class="cart-total">
          <span>总计:</span>
          <span class="total-price">¥{{ totalPrice.toFixed(2) }}</span>
        </div>
        
        <div class="cart-actions">
          <a-button @click="$router.push('/')">继续购物</a-button>
          <a-button type="primary" @click="checkout">结算</a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getShoppingCart, updateCartItem, removeCartItem, clearCart } from '@/api/shopping-cart';

export default {
  name: 'ShoppingCart',
  data() {
    return {
      cartItems: [],
      loading: true,
      defaultImage: 'https://file.ituring.com.cn/SmallCover/2212c21242c05ebc49f3'
    };
  },
  computed: {
    totalPrice() {
      return this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
  },
  mounted() {
    this.fetchCart();
  },
  methods: {
    async fetchCart() {
      this.loading = true;
      try {
        const response = await getShoppingCart();
        this.cartItems = response.items || [];
      } catch (error) {
        console.error('获取购物车失败:', error);
        this.$message.error('获取购物车失败');
        
        // 如果是未授权错误，跳转到登录页
        if (error.response && error.response.status === 401) {
          this.$message.warning('请先登录');
          this.$router.push({
            path: '/login',
            query: { redirect: this.$route.fullPath }
          });
        }
      } finally {
        this.loading = false;
      }
    },
    
    async updateQuantity(itemId, quantity) {
      try {
        await updateCartItem(itemId, { quantity });
        this.$message.success('数量已更新');
      } catch (error) {
        console.error('更新数量失败:', error);
        this.$message.error('更新数量失败');
        // 刷新购物车，恢复原始数据
        this.fetchCart();
      }
    },
    
    async removeItem(itemId) {
      try {
        await removeCartItem(itemId);
        // 从本地数组中移除
        this.cartItems = this.cartItems.filter(item => item.id !== itemId);
        this.$message.success('商品已从购物车中移除');
      } catch (error) {
        console.error('移除商品失败:', error);
        this.$message.error('移除商品失败');
      }
    },
    
    async clearCart() {
      this.$confirm({
        title: '确认清空购物车?',
        content: '此操作将清空购物车中的所有商品，是否继续?',
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          try {
            await clearCart();
            this.cartItems = [];
            this.$message.success('购物车已清空');
          } catch (error) {
            console.error('清空购物车失败:', error);
            this.$message.error('清空购物车失败');
          }
        }
      });
    },
    
    checkout() {
      // 跳转到结算页面
      this.$router.push('/checkout');
    }
  }
};
</script>

<style scoped>
.shopping-cart {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 50px 0;
}

.empty-cart {
  text-align: center;
  padding: 50px 0;
}

.cart-items {
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.cart-item {
  display: flex;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #f0f0f0;
}

.item-image {
  width: 80px;
  height: 80px;
  margin-right: 15px;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.item-details {
  flex: 1;
}

.item-name {
  margin: 0 0 5px;
  font-size: 16px;
}

.item-price {
  color: #ff6b00;
  margin: 0;
}

.item-quantity {
  width: 120px;
  margin: 0 20px;
}

.item-total {
  width: 100px;
  text-align: right;
  font-weight: bold;
  color: #ff6b00;
}

.item-actions {
  width: 50px;
  text-align: center;
}

.cart-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.cart-total {
  font-size: 18px;
}

.total-price {
  font-weight: bold;
  color: #ff6b00;
  margin-left: 10px;
}

.cart-actions button {
  margin-left: 10px;
}
</style>
