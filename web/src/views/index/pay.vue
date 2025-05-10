<template>
  <div>
    <Header />
    <div class="pay-content">
      <div class="title">订单提交成功</div>
      <div class="text time-margin">
        <span>请在 </span>
        <span class="time">{{ ddlTime }}</span>
        <span> 之前付款，超时订单将自动取消</span>
      </div>
      <div class="text">支付金额</div>
      <div class="price">
        <span class="num">{{ amount }}</span>
        <span>元</span>
      </div>
      <div class="pay-choose-view" style="">
        <div class="pay-choose-box flex-view">
          <div
            :class="[
              'choose-box',
              payMethod === 'wechat' ? 'choose-box-active' : ''
            ]"
            @click="selectPayMethod('wechat')"
          >
            <img src="@/assets/images/wx-pay-icon.svg" />
            <span>微信支付</span>
          </div>
          <div
            :class="[
              'choose-box',
              payMethod === 'alipay' ? 'choose-box-active' : ''
            ]"
            @click="selectPayMethod('alipay')"
          >
            <img src="@/assets/images/ali-pay-icon.svg" />
            <span>支付宝</span>
          </div>
        </div>
        <div class="tips">请选择任意一种支付方式</div>
        <button
          :class="['pay-btn', payMethod ? 'pay-btn-active' : '']"
          @click="handlePay()"
          :disabled="!payMethod || isProcessing"
        >
          {{ isProcessing ? "处理中..." : "确认支付" }}
        </button>
      </div>
      <div class="pay-qr-view" v-if="showPayResult">
        <div class="pay-result-box">
          <div v-if="paySuccess" class="success-message">
            <p>支付成功</p>
            <button class="continue-btn" @click="goToOrderList">
              查看订单
            </button>
          </div>
          <div v-else class="error-message">
            <p>{{ errorMessage || "支付失败，请重试" }}</p>
            <button class="retry-btn" @click="showPayResult = false">
              重新支付
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Header from "@/views/index/components/header";
import Footer from "@/views/index/components/footer";
import request from "@/utils/request";

export default {
  components: {
    Footer,
    Header
  },
  data() {
    return {
      ddlTime: undefined,
      amount: undefined,
      orderId: undefined,
      payMethod: null, // 'wechat' 或 'alipay'
      isProcessing: false,
      showPayResult: false,
      paySuccess: false,
      errorMessage: ""
    };
  },
  mounted() {
    this.amount = this.$route.query.amount;
    this.orderId = this.$route.query.order_id;

    if (!this.orderId) {
      this.$message.error("订单信息不完整");
      setTimeout(() => {
        this.$router.push("/orders");
      }, 2000);
      return;
    }

    // 设置截止时间为当前时间后24小时
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 24);
    this.ddlTime = this.formatDate(deadline.getTime(), "YY-MM-DD hh:mm:ss");
  },
  methods: {
    selectPayMethod(method) {
      this.payMethod = method;
    },

    handlePay() {
      if (!this.payMethod || this.isProcessing) return;

      this.isProcessing = true;

      // 调用支付订单API
      request({
        url: `/api/orders/${this.orderId}/pay/`,
        method: "post",
        data: { payment_method: this.payMethod }
      })
        .then(response => {
          console.log("支付成功:", response);
          this.paySuccess = true;
          this.showPayResult = true;
          this.$message.success("支付成功！");
        })
        .catch(error => {
          console.error("支付失败:", error);
          this.paySuccess = false;
          this.showPayResult = true;

          // 解析错误信息
          if (error.response && error.response.data) {
            if (typeof error.response.data === "string") {
              this.errorMessage = error.response.data;
            } else if (error.response.data.message) {
              this.errorMessage = error.response.data.message;
            } else if (error.response.data.error) {
              this.errorMessage = error.response.data.error;
            }
          } else {
            this.errorMessage = "支付失败，请重试";
          }

          this.$message.error(this.errorMessage);
        })
        .finally(() => {
          this.isProcessing = false;
        });
    },

    goToOrderList() {
      this.$router.push("/index/user/orderView");
    },

    formatDate(time, format = "YY-MM-DD hh:mm:ss") {
      const date = new Date(time);

      const year = date.getFullYear(),
        month = date.getMonth() + 1,
        day = date.getDate(), // 修正：不需要加1
        hour = date.getHours(),
        min = date.getMinutes(),
        sec = date.getSeconds();
      const preArr = Array.apply(null, Array(10)).map(function(elem, index) {
        return "0" + index;
      });

      const newTime = format
        .replace(/YY/g, year)
        .replace(/MM/g, preArr[month] || month)
        .replace(/DD/g, preArr[day] || day)
        .replace(/hh/g, preArr[hour] || hour)
        .replace(/mm/g, preArr[min] || min)
        .replace(/ss/g, preArr[sec] || sec);

      return newTime;
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

.pay-content {
  position: relative;
  margin: 120px auto 0;
  width: 500px;
  background: #fff;
  overflow: hidden;

  .title {
    color: #152844;
    font-weight: 500;
    font-size: 24px;
    line-height: 22px;
    height: 22px;
    text-align: center;
    margin-bottom: 11px;
  }

  .time-margin {
    margin: 11px 0 24px;
  }

  .text {
    height: 22px;
    line-height: 22px;
    font-size: 14px;
    text-align: center;
    color: #152844;
  }

  .time {
    color: #f62a2a;
  }

  .text {
    height: 22px;
    line-height: 22px;
    font-size: 14px;
    text-align: center;
    color: #152844;
  }

  .price {
    color: #ff8a00;
    font-weight: 500;
    font-size: 16px;
    height: 36px;
    line-height: 36px;
    text-align: center;

    .num {
      font-size: 28px;
    }
  }

  .pay-choose-view {
    margin-top: 24px;

    .choose-box {
      width: 140px;
      height: 126px;
      border: 1px solid #cedce4;
      border-radius: 4px;
      text-align: center;
      cursor: pointer;
    }

    .pay-choose-box {
      -webkit-box-pack: justify;
      -ms-flex-pack: justify;
      justify-content: space-between;
      max-width: 300px;
      margin: 0 auto;

      img {
        height: 40px;
        margin: 24px auto 16px;
        display: block;
      }
    }

    .tips {
      color: #6f6f6f;
      font-size: 14px;
      line-height: 22px;
      height: 22px;
      text-align: center;
      margin: 16px 0 24px;
    }

    .choose-box-active {
      border: 1px solid #4684e2;
    }

    .tips {
      color: #6f6f6f;
      font-size: 14px;
      line-height: 22px;
      height: 22px;
      text-align: center;
      margin: 16px 0 24px;
    }

    .pay-btn {
      cursor: pointer;
      background: #c3c9d5;
      border-radius: 32px;
      width: 104px;
      height: 32px;
      line-height: 32px;
      border: none;
      outline: none;
      font-size: 14px;
      color: #fff;
      text-align: center;
      display: block;
      margin: 0 auto;
    }

    .pay-btn-active {
      background: #4684e2;
    }
  }
}
.flex-view {
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
}

.pay-content {
  position: relative;
  margin: 120px auto 0;
  width: 500px;
  background: #fff;
  overflow: hidden;

  /* 现有样式保持不变 */

  /* 添加支付结果样式 */
  .pay-result-box {
    text-align: center;
    padding: 30px 0;

    .result-icon {
      width: 60px;
      height: 60px;
      margin-bottom: 15px;
    }

    p {
      font-size: 18px;
      margin-bottom: 20px;
    }

    .success-message {
      color: #52c41a;
    }

    .error-message {
      color: #f5222d;
    }

    .continue-btn,
    .retry-btn {
      padding: 8px 20px;
      border-radius: 20px;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 14px;
    }

    .continue-btn {
      background-color: #4684e2;
    }

    .retry-btn {
      background-color: #ff4d4f;
    }
  }
}
</style>
