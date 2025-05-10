<template>
  <div>
    <Header />
    <section class="cart-page flex-view">
      <div class="left-flex">
        <div class="title flex-view">
          <h3>订单明细</h3>
        </div>
        <div class="cart-list-view">
          <div class="list-th flex-view">
            <span class="line-1">商品名称</span>
            <span class="line-2">价格</span>
            <span class="line-5">数量</span>
            <span class="line-6">操作</span>
          </div>
          <div class="list" v-if="cartItems && cartItems.length > 0">
            <div
              class="items flex-view"
              v-for="item in cartItems"
              :key="item.id"
            >
              <div class="book flex-view">
                <img :src="item.product_image || productImage" alt="商品图片" />
                <h2>{{ item.product_name }}</h2>
              </div>
              <div class="pay">¥{{ item.price }}</div>
              <a-input-number
                v-model="item.quantity"
                :min="1"
                :max="10"
                @change="value => updateItemQuantity(item, value)"
              />
              <img
                src="@/assets/images/delete-icon.svg"
                class="delete"
                @click="removeItem(item.id)"
              />
            </div>
          </div>
          <!-- 如果购物车为空显示提示 -->
          <div class="empty-cart" v-else>
            <p>购物车为空，请先添加商品</p>
            <button class="btn buy" @click="$router.push('/')">去购物</button>
          </div>
        </div>
        <div class="title flex-view">
          <h3>备注</h3>
        </div>
        <textarea
          v-model="remark"
          placeholder="输入备注信息，100字以内"
          class="remark"
        >
        </textarea>
      </div>

      <div class="address-form">
        <div class="form-item">
          <label for="recipient_name">收货人姓名:</label>
          <input
            id="recipient_name"
            v-model="recipient_name"
            type="text"
            placeholder="请输入收货人姓名"
            class="form-input"
          />
        </div>
        <div class="form-item">
          <label for="recipient_phone">联系电话:</label>
          <input
            id="recipient_phone"
            v-model="recipient_phone"
            type="text"
            placeholder="请输入联系电话"
            class="form-input"
          />
        </div>
        <div class="form-item">
          <label for="shipping_address">收货地址:</label>
          <textarea
            id="shipping_address"
            v-model="shipping_address"
            placeholder="请输入详细收货地址"
            class="form-input address-textarea"
          ></textarea>
        </div>

        <div class="title flex-view">
          <h3>备注</h3>
        </div>
        <textarea
          v-model="remark"
          placeholder="输入备注信息，100字以内"
          class="remark"
        >
        </textarea>
      </div>

      <div class="right-flex">
        <div class="title flex-view">
          <h3>结算</h3>
          <span class="click-txt">价格</span>
        </div>
        <div class="price-view">
          <div class="price-item flex-view">
            <div class="item-name">商品总价</div>
            <div class="price-txt">¥{{ this.amount }}</div>
          </div>
          <div class="price-item flex-view">
            <div class="item-name">商品优惠</div>
            <div class="price-txt">¥0</div>
          </div>
          <div class="price-item flex-view">
            <div class="item-name">商品折扣</div>
            <div class="price-txt">¥0</div>
          </div>
          <div class="total-price-view flex-view">
            <span>合计</span>
            <div class="price">
              <span class="font-big">¥{{ this.amount }}</span>
            </div>
          </div>
          <div class="btns-view">
            <button class="btn buy" @click="handleBack()">返回</button>
            <button
              class="btn pay jiesuan"
              @click="handleJiesuan()"
              :disabled="!cartItems || cartItems.length === 0"
            >
              结算
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
// 其他导入保持不变...
// 改用封装的request代替直接使用axios
import request from "@/utils/request.js";
import Header from "@/views/index/components/header";
import Footer from "@/views/index/components/footer";

export default {
  // 组件声明保持不变...
  components: {
    Footer,
    Header
  },
  data() {
    return {
      remark: undefined,
      amount: 0,
      cartItems: [], // 购物车商品列表
      cartId: null, // 新增：购物车ID
      productImage:
        "https://file.ituring.com.cn/SmallCover/2212c21242c05ebc49f3", // 默认图片
      // 添加收货信息字段
      recipient_name: "",
      recipient_phone: "",
      shipping_address: ""
    };
  },
  mounted() {
    // 获取购物车信息
    this.getCartItems();
  },
  methods: {
    // 获取购物车商品 - 修改适配新的数据结构
    getCartItems() {
      request({
        url: `/api/cart/`,
        method: "get"
      })
        .then(response => {
          // 检查响应是否包含必要的数据
          if (response && response.items && Array.isArray(response.items)) {
            // 保存购物车ID，用于后续操作
            this.cartId = response.id;

            // 格式化购物车项 - 适配新的数据结构
            this.cartItems = response.items.map(item => ({
              id: item.id,
              product_id: item.product_id,
              product_name: item.name,
              product_image: item.image_url,
              price: parseFloat(item.price),
              quantity: item.quantity,
              total_price: parseFloat(
                item.total_item_price || item.price * item.quantity
              )
            }));

            // 使用后端提供的总价，如果存在的话
            if (response.total_price !== undefined) {
              this.amount = parseFloat(response.total_price).toFixed(2);
            } else if (response.total !== undefined) {
              this.amount = parseFloat(response.total).toFixed(2);
            } else {
              // 如果后端没有提供总价，自己计算
              this.calculateTotalAmount();
            }
          } else {
            // 处理空购物车或格式不符的情况
            this.cartItems = [];
            this.amount = "0.00";
            console.log("购物车为空或数据格式不符");
          }
        })
        .catch(error => {
          console.error("获取购物车数据失败:", error);

          // 如果是未授权错误，跳转到登录页
          if (error.response && error.response.status === 401) {
            this.$message.warning("请先登录");
            this.$router.push({
              path: "/login",
              query: { redirect: this.$route.fullPath }
            });
          } else {
            this.$message.error("获取购物车数据失败");
          }
        });
    },

    // 更新商品数量
    updateItemQuantity(item, value) {
      // 更新本地数据
      item.quantity = value;
      item.total_price = (item.price * value).toFixed(2);

      // 重新计算总金额
      this.calculateTotalAmount();

      // 更新购物车API
      request({
        url: `/api/cart/items/${item.id}`, // 移除末尾的斜杠
        method: "put",
        data: { quantity: value }
      }).catch(error => {
        console.error("更新购物车商品数量失败:", error);
        this.$message.error("更新数量失败");
        // 刷新购物车，恢复原始数据
        this.getCartItems();
      });
    },

    // 删除购物车商品
    removeItem(itemId) {
      request({
        url: `/api/cart/items/${itemId}`, // 移除末尾的斜杠
        method: "delete"
      })
        .then(() => {
          // 更新本地数据
          this.cartItems = this.cartItems.filter(item => item.id !== itemId);
          this.calculateTotalAmount();
          this.$message.success("商品已从购物车中移除");
        })
        .catch(error => {
          console.error("移除商品失败:", error);
          this.$message.error("移除商品失败");
        });
    },

    // 计算总金额
    calculateTotalAmount() {
      this.amount = this.cartItems
        .reduce((total, item) => {
          return total + parseFloat(item.price) * item.quantity;
        }, 0)
        .toFixed(2);
    },

    // 其他方法保持不变...
    handleBack() {
      this.$router.back();
    },

    // 修改结算方法，添加收货信息
    handleJiesuan() {
      // 检查购物车是否为空
      if (!this.cartItems || this.cartItems.length === 0) {
        this.$message.warning("购物车为空，请先添加商品");
        return;
      }

      // 验证表单
      if (!this.validateForm()) {
        return;
      }

      // 从localStorage获取用户信息
      let userData = null;
      try {
        const userStr = localStorage.getItem("user");
        userData = userStr ? JSON.parse(userStr) : null;
      } catch (e) {
        console.error("解析用户数据出错:", e);
      }

      const userId = userData ? userData.id : null;

      if (!userId) {
        this.$message.warning("请先登录！");
        this.$router.push({
          path: "/login",
          query: { redirect: this.$route.fullPath }
        });
        return;
      }

      // 准备提交订单的数据 - 添加收货信息
      const orderData = {
        user: userId,
        total_amount: parseFloat(this.amount),
        // 添加收货信息
        recipient_name: this.recipient_name,
        recipient_phone: this.recipient_phone,
        shipping_address: this.shipping_address,
        // 收集购物车中所有商品作为订单项
        items: this.cartItems.map(item => ({
          product: item.product_id,
          quantity: item.quantity,
          price: parseFloat(item.price)
        }))
      };

      if (this.remark) {
        orderData.remarks = this.remark;
      }

      // 创建订单 - 使用封装的request
      request({
        url: `/api/orders/`, // 修改为正确的API路径
        method: "post",
        data: orderData
      })
        .then(response => {
          this.$message.success("订单创建成功，请支付");

          // 清空购物车
          this.clearCart();

          // 跳转到支付页面
          this.$router.push({
            name: "pay",
            query: {
              amount: this.amount,
              order_id: response.id || response.order_id
            }
          });
        })
        .catch(error => {
          console.error("创建订单失败:", error);
          let errorMsg = "订单创建失败";

          // 提取错误信息
          if (error.response && error.response.data) {
            // 处理错误信息
            const responseData = error.response.data;
            if (typeof responseData === "object") {
              // 合并所有字段的错误信息
              let errors = [];
              for (const field in responseData) {
                if (Array.isArray(responseData[field])) {
                  errors.push(`${field}: ${responseData[field].join(", ")}`);
                }
              }
              if (errors.length > 0) {
                errorMsg = errors.join("\n");
              }
            } else if (responseData.message) {
              errorMsg = responseData.message;
            }
          }

          this.$message.error(errorMsg);

          // 如果是未授权错误，跳转到登录页
          if (error.response && error.response.status === 401) {
            this.$router.push({
              path: "/login",
              query: { redirect: this.$route.fullPath }
            });
          }
        });
    },
    // 结算前验证表单
    validateForm() {
      if (!this.recipient_name) {
        this.$message.warning("请输入收货人姓名");
        return false;
      }
      if (!this.recipient_phone) {
        this.$message.warning("请输入联系电话");
        return false;
      }
      if (!this.shipping_address) {
        this.$message.warning("请输入收货地址");
        return false;
      }
      return true;
    },
    // 清空购物车
    clearCart() {
      request({
        url: `/api/cart/`, // 修改为正确的API路径
        method: "delete"
      }).catch(error => {
        console.error("清空购物车失败:", error);
        // 这里不需要显示错误消息，因为订单已经成功创建
      });
    }
  }
};
</script>

<style scoped lang="less">
.flex-view {
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
}

.cart-page {
  width: 1024px;
  min-height: 50vh;
  margin: 100px auto;
}

.left-flex {
  -webkit-box-flex: 17;
  -ms-flex: 17;
  flex: 17;
  padding-right: 20px;
}

.title {
  -webkit-box-pack: justify;
  -ms-flex-pack: justify;
  justify-content: space-between;
  -webkit-box-align: center;
  -ms-flex-align: center;
  align-items: center;

  h3 {
    color: #152844;
    font-weight: 600;
    font-size: 18px;
    height: 26px;
    line-height: 26px;
    margin: 0;
  }
}

.cart-list-view {
  margin: 4px 0 40px;

  .list-th {
    height: 42px;
    line-height: 42px;
    border-bottom: 1px solid #cedce4;
    color: #152844;
    font-size: 14px;

    .line-1 {
      -webkit-box-flex: 1;
      -ms-flex: 1;
      flex: 1;
      margin-right: 20px;
    }

    .line-2,
    .pc-style .cart-list-view .list-th .line-3,
    .pc-style .cart-list-view .list-th .line-4 {
      width: 65px;
      margin-right: 20px;
    }

    .line-5 {
      width: 80px;
      margin-right: 40px;
    }

    .line-6 {
      width: 28px;
    }
  }
}

.items {
  -webkit-box-align: center;
  -ms-flex-align: center;
  align-items: center;
  margin-top: 20px;

  .book {
    -webkit-box-flex: 1;
    -ms-flex: 1;
    flex: 1;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    margin-right: 20px;
    cursor: pointer;

    img {
      width: 48px;
      margin-right: 16px;
      border-radius: 4px;
    }

    h2 {
      -webkit-box-flex: 1;
      -ms-flex: 1;
      flex: 1;
      font-size: 14px;
      line-height: 22px;
      color: #152844;
    }
  }

  .type {
    width: 65px;
    margin-right: 20px;
    color: #152844;
    font-size: 14px;
  }

  .pay {
    color: #ff8a00;
    font-weight: 600;
    font-size: 16px;
    width: 65px;
    margin-right: 20px;
  }

  .num-box {
    width: 80px;
    margin-right: 43px;
    border-radius: 4px;
    border: 1px solid #cedce4;
    -webkit-box-pack: justify;
    -ms-flex-pack: justify;
    justify-content: space-between;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    height: 32px;
    padding: 0 4px;
  }

  .delete {
    margin-left: 36px;
    width: 24px;
    cursor: pointer;
  }
}

.mb-24 {
  margin-bottom: 24px;
}

.show-txt {
  color: #ff8a00;
  font-size: 14px;
}

.remark {
  width: 100%;
  background: #f6f9fb;
  border: 0;
  border-radius: 4px;
  padding: 6px 12px;
  //color: #152844;
  margin-top: 16px;
  resize: none;
  height: 56px;
  line-height: 22px;
}

.right-flex {
  -webkit-box-flex: 8;
  -ms-flex: 8;
  flex: 8;
  padding-left: 24px;
  border-left: 1px solid #cedce4;
}

.click-txt {
  color: #4684e2;
  font-size: 14px;
  cursor: pointer;
}

.address-view {
  margin: 12px 0 24px;

  .info {
    color: #909090;
    font-size: 14px;
    .info-blue {
      cursor: pointer;
      color: #4684e2;
    }
  }

  .name {
    color: #152844;
    font-weight: 500;
  }

  .tel {
    color: #152844;
    float: right;
  }

  .address {
    color: #152844;
    margin-top: 4px;
  }
}

.price-view {
  overflow: hidden;
  margin-top: 16px;

  .price-item {
    -webkit-box-pack: justify;
    -ms-flex-pack: justify;
    justify-content: space-between;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    margin-bottom: 8px;
    font-size: 14px;

    .item-name {
      color: #152844;
    }

    .price-txt {
      font-weight: 500;
      color: #ff8a00;
    }
  }

  .total-price-view {
    margin-top: 12px;
    border-top: 1px solid #cedce4;
    -webkit-box-pack: justify;
    -ms-flex-pack: justify;
    justify-content: space-between;
    -webkit-box-align: start;
    -ms-flex-align: start;
    align-items: flex-start;
    padding-top: 10px;
    color: #152844;
    font-weight: 500;

    .price {
      color: #ff8a00;
      font-size: 16px;
      height: 36px;
      line-height: 36px;
    }
  }

  .btns-view {
    margin-top: 24px;
    text-align: right;

    .buy {
      background: #fff;
      color: #4684e2;
    }

    .jiesuan {
      cursor: pointer;
      background: #4684e2;
      color: #fff;
    }

    .btn {
      cursor: pointer;
      width: 96px;
      height: 36px;
      line-height: 33px;
      margin-left: 16px;
      text-align: center;
      border-radius: 32px;
      border: 1px solid #4684e2;
      font-size: 16px;
      outline: none;
    }
  }
}

.address-title {
  margin-top: 20px;
}

.address-form {
  background-color: #fff;
  border-radius: 4px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-item {
  margin-bottom: 15px;
}

.form-item label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.address-textarea {
  min-height: 60px;
  resize: vertical;
}
</style>
