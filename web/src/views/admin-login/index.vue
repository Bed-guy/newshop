<template>
  <div class="admin-login">
    <a-card
      title="管理员登录"
      :bordered="false"
      style="width: 400px; margin: 100px auto;"
    >
      <a-form :form="form" @submit="handleSubmit">
        <a-form-item>
          <a-input
            v-decorator="[
              'username',
              { rules: [{ required: true, message: '请输入用户名' }] }
            ]"
            placeholder="用户名"
          >
            <a-icon slot="prefix" type="user" style="color: rgba(0,0,0,.25)" />
          </a-input>
        </a-form-item>
        <a-form-item>
          <a-input-password
            v-decorator="[
              'password',
              { rules: [{ required: true, message: '请输入密码' }] }
            ]"
            placeholder="密码"
          >
            <a-icon slot="prefix" type="lock" style="color: rgba(0,0,0,.25)" />
          </a-input-password>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" block :loading="loading">
            登录
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script>
import { adminLogin } from "@/api/auth";

export default {
  name: "AdminLogin",
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
            const response = await adminLogin(values.username, values.password);

            // 保存用户信息和令牌
            localStorage.setItem("token", response.token);
            localStorage.setItem("userInfo", JSON.stringify(response.user));

            // 显示成功消息
            this.$message.success("登录成功");

            // 跳转到管理员页面
            this.$router.push("/admin/overview");
          } catch (error) {
            console.error("登录失败:", error);
            this.$message.error(
              "登录失败: " +
                (error.response &&
                error.response.data &&
                error.response.data.message
                  ? error.response.data.message
                  : "用户名或密码错误")
            );
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
.admin-login {
  height: 100vh;
  background-color: #f0f2f5;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
