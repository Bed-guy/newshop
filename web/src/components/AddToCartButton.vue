<template>
  <div class="add-to-cart">
    <div class="quantity-selector">
      <a-input-number 
        v-model="quantity" 
        :min="1" 
        :max="maxQuantity" 
        :disabled="loading || disabled"
      />
    </div>
    
    <a-button 
      type="primary" 
      icon="shopping-cart" 
      :loading="loading"
      :disabled="disabled || maxQuantity === 0"
      @click="addToCart"
    >
      {{ maxQuantity === 0 ? '暂时缺货' : '加入购物车' }}
    </a-button>
  </div>
</template>

<script>
import { addToCart } from '@/api/shopping-cart';

export default {
  name: 'AddToCartButton',
  props: {
    productId: {
      type: [Number, String],
      required: true
    },
    stock: {
      type: Number,
      default: 0
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      quantity: 1,
      loading: false
    };
  },
  computed: {
    maxQuantity() {
      return this.stock;
    }
  },
  methods: {
    async addToCart() {
      if (this.loading || this.disabled || this.maxQuantity === 0) {
        return;
      }
      
      this.loading = true;
      
      try {
        await addToCart({
          product_id: this.productId,
          quantity: this.quantity
        });
        
        this.$message.success('商品已添加到购物车');
        this.$emit('added');
      } catch (error) {
        console.error('添加到购物车失败:', error);
        
        // 如果是未授权错误，跳转到登录页
        if (error.response && error.response.status === 401) {
          this.$message.warning('请先登录');
          this.$router.push({
            path: '/login',
            query: { redirect: this.$route.fullPath }
          });
        } else {
          this.$message.error('添加到购物车失败');
        }
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.add-to-cart {
  display: flex;
  align-items: center;
  margin: 15px 0;
}

.quantity-selector {
  margin-right: 15px;
}
</style>
