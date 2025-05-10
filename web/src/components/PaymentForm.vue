<template>
  <div class="payment-form">
    <a-form :form="form" @submit="handleSubmit">
      <a-form-item label="支付方式">
        <a-radio-group v-decorator="['payment_method', { rules: [{ required: true, message: '请选择支付方式' }] }]">
          <a-radio value="alipay">
            <a-icon type="alipay" />
            支付宝
          </a-radio>
          <a-radio value="wechat">
            <a-icon type="wechat" />
            微信支付
          </a-radio>
          <a-radio value="credit_card">
            <a-icon type="credit-card" />
            信用卡
          </a-radio>
          <a-radio value="cash">
            <a-icon type="wallet" />
            货到付款
          </a-radio>
        </a-radio-group>
      </a-form-item>
      
      <a-form-item>
        <a-button type="primary" html-type="submit" :loading="loading" block>
          确认支付 ¥{{ amount.toFixed(2) }}
        </a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script>
import { payOrder } from '@/api/order';

export default {
  name: 'PaymentForm',
  props: {
    orderId: {
      type: [Number, String],
      required: true
    },
    amount: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      form: this.$form.createForm(this),
      loading: false
    };
  },
  methods: {
    handleSubmit(e) {
      e.preventDefault();
      this.form.validateFields(async (err, values) => {
        if (!err) {
          this.loading = true;
          try {
            const response = await payOrder(this.orderId, values);
            this.$message.success('支付成功');
            this.$emit('success', response);
          } catch (error) {
            console.error('支付失败:', error);
            this.$message.error('支付失败: ' + (error.response?.data?.message || error.message));
          } finally {
            this.loading = false;
          }
        }
      });
    }
  }
};
</script>

<style scoped>
.payment-form {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.ant-radio-wrapper {
  display: block;
  height: 30px;
  line-height: 30px;
  margin: 10px 0;
}

.ant-radio-wrapper .anticon {
  margin-right: 8px;
  font-size: 18px;
}

.anticon-alipay {
  color: #1677ff;
}

.anticon-wechat {
  color: #07c160;
}

.anticon-credit-card {
  color: #fa8c16;
}

.anticon-wallet {
  color: #722ed1;
}
</style>
