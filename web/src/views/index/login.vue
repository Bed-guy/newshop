<template>
  <div class="container">
    <div class="login-page pc-style">
      <img src="@/assets/images/front-logo.png" alt="logo" class="logo-icon" />
      <div class="login-tab">
        <div class="tab-selected">
          <span>邮箱登录</span>
          <span class="tabline tabline-width"></span>
        </div>
      </div>
      <div class="mail-login" type="login">
        <div class="common-input">
          <img src="@/assets/images/mail-icon.svg" class="left-icon" />
          <div class="input-view">
            <input
              placeholder="请输入注册邮箱"
              v-model="loginForm.username"
              type="text"
              class="input"
            />
            <p class="err-view"></p>
          </div>
          <!---->
        </div>
        <div class="common-input">
          <img src="@/assets/images/pwd-icon.svg" class="left-icon" />
          <div class="input-view">
            <input
              placeholder="请输入密码"
              v-model="loginForm.password"
              type="password"
              class="input"
            />
            <p class="err-view"></p>
          </div>
          <!--          <img src="@/assets/pwd-hidden.svg" class="right-icon">-->
          <!---->
        </div>
        <div class="next-btn-view">
          <button
            class="next-btn btn-active"
            style="margin: 16px 0px;"
            @click="handleLogin"
          >
            登录
          </button>
        </div>
      </div>
      <div class="operation">
        <a
          @click="$router.push({ name: 'register' })"
          class="forget-pwd"
          style="text-align: left;"
          >注册新帐号</a
        >
        <a class="forget-pwd" style="text-align: right;">忘记密码？</a>
      </div>

      <!-- 开发测试用：设置指定令牌 -->
      <div class="dev-tools" v-if="showDevTools">
        <button class="dev-btn" @click="setSpecificToken">设置指定令牌</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { logUserLogin } from "@/utils/analytics";

export default {
  name: "Login",
  data() {
    return {
      loginForm: {
        username: "",
        password: ""
      },
      baseUrl: "http://localhost:8000",
      error: "",
      showDevTools: true, // 开发环境下显示开发工具
      specificToken: {
        token: "56e010dc228db4588bdbb78e2c9a3038",
        user: {
          id: 13,
          username: "1@qq.com",
          email: "",
          is_active: 1,
          date_joined: "2025-05-10T12:19:06.000Z",
          is_superuser: false
        }
      }
    };
  },
  methods: {
    handleLogin() {
      // 表单验证
      if (!this.loginForm.username) {
        this.$message.error("请输入用户名");
        return;
      }
      if (!this.loginForm.password) {
        this.$message.error("请输入密码");
        return;
      }

      // 调用登录API
      axios
        .post(`${this.baseUrl}/api/auth/login/`, {
          username: this.loginForm.username,
          password: this.loginForm.password
        })
        .then(response => {
          // 登录成功
          console.log("登录成功:", response.data);

          // 保存用户信息到localStorage
          localStorage.setItem("user", JSON.stringify(response.data.user));
          localStorage.setItem("token", response.data.token);

          // 保存登录状态
          this.$store.commit("SET_USER", response.data.user);
          this.$store.commit("SET_LOGGED_IN", true);

          // 记录用户登录日志
          logUserLogin(response.data.user.id);

          this.loginSuccess();
        })
        .catch(error => {
          console.error("登录失败:", error);
          let errorMsg = "登录失败";
          if (error.response) {
            // 服务器返回错误信息
            errorMsg = error.response.data.message || "用户名或密码错误";
          }
          this.requestFailed({ msg: errorMsg });
        });
    },

    loginSuccess() {
      this.$router.push({ path: "/" });
      this.$message.success("登录成功！");
    },

    requestFailed(err) {
      console.log(err);
      this.$message.error(err.msg || "登录失败");
      this.error = err.msg;
    },

    // 设置指定令牌
    setSpecificToken() {
      // 保存用户信息到localStorage
      localStorage.setItem("user", JSON.stringify(this.specificToken.user));
      localStorage.setItem("token", this.specificToken.token);

      // 保存登录状态
      this.$store.commit("SET_USER", this.specificToken.user);
      this.$store.commit("SET_LOGGED_IN", true);

      // 记录用户登录日志
      logUserLogin(this.specificToken.user.id);

      this.$message.success("已设置指定令牌！");
      this.$router.push({ path: "/" });
    }
  }
};
</script>

<style scoped lang="less">
@primary-color: #4caf50; /* 新鲜草绿色 */
@heading-color: #2e7d32; /* 深叶绿色 */
@text-color: #33691e; /* 橄榄绿文本 */
@border-color: #aed581; /* 嫩芽绿边框 */
@background-light: #f1f8e9; /* 清新背景色 */
@accent-color: #ff8f00; /* 成熟橙色 */
@error-color: #e53935; /* 鲜草莓红 */

div {
  display: block;
}

.container {
  background-size: cover;
  background-position: center;
  background-image: url("~@/assets/images/login.png");
  height: 100%;
  max-width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(244, 250, 235, 0.7) 0%,
      rgba(255, 255, 255, 0.5) 100%
    );
    backdrop-filter: blur(3px);
  }
}

.login-page {
  overflow: hidden;
  background: #fff;
  position: relative;
  z-index: 1;

  .logo-icon {
    margin-top: 28px;
    margin-left: auto;
    margin-right: auto;
    width: 56px;
    height: 56px;
    display: block;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    transition: transform 0.3s;

    &:hover {
      transform: scale(1.05) rotate(5deg);
    }
  }
}

.pc-style {
  position: relative;
  width: 400px;
  min-height: 480px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1), 0 8px 12px rgba(76, 175, 80, 0.1);
  padding-bottom: 24px;

  /* 添加水珠纹理背景 */
  background-image: radial-gradient(
      circle at 10% 90%,
      rgba(174, 213, 129, 0.1) 0%,
      rgba(255, 255, 255, 0) 40%
    ),
    radial-gradient(
      circle at 90% 10%,
      rgba(174, 213, 129, 0.1) 0%,
      rgba(255, 255, 255, 0) 40%
    );

  /* 添加侧边装饰元素 */
  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 20%;
    height: 60%;
    width: 4px;
    background: linear-gradient(to bottom, @primary-color, @heading-color);
    border-radius: 0 4px 4px 0;
  }
}

.login-tab {
  display: flex;
  color: @text-color;
  font-size: 16px;
  font-weight: 600;
  height: 52px;
  line-height: 52px;
  margin: 12px 0 32px;
  border-bottom: 1px solid rgba(174, 213, 129, 0.3);

  div {
    position: relative;
    flex: 1;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      color: @primary-color;
    }
  }

  .tabline {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    margin: 0 auto;
    display: inline-block;
    width: 0;
    height: 3px;
    background: @primary-color;
    transition: width 0.5s cubic-bezier(0.46, 1, 0.23, 1.52);
  }

  .tab-selected {
    color: @heading-color;
    font-weight: 700;
  }

  .tabline-width {
    width: 40px;
  }
}

.mail-login {
  margin: 0px 40px;
}

.common-input {
  display: flex;
  align-items: flex-start;
  margin-bottom: 24px;
  position: relative;

  &:after {
    content: "";
    position: absolute;
    bottom: -12px;
    left: 36px;
    right: 0;
    height: 1px;
    background: linear-gradient(to right, @border-color, transparent);
  }

  .left-icon {
    margin-right: 16px;
    width: 24px;
    height: 24px;
    object-fit: contain;
    filter: invert(39%) sepia(64%) saturate(591%) hue-rotate(67deg)
      brightness(93%) contrast(89%);
  }

  .input-view {
    flex: 1;

    .input {
      font-weight: 500;
      font-size: 15px;
      color: @text-color;
      height: 32px;
      line-height: 32px;
      border: none;
      padding: 0;
      display: block;
      width: 100%;
      letter-spacing: 0.5px;
      background: transparent;
      transition: all 0.3s;

      &::placeholder {
        color: #90a4ae;
        transition: all 0.3s;
      }

      &:focus {
        &::placeholder {
          opacity: 0.7;
          transform: translateX(3px);
        }
      }
    }

    .err-view {
      margin-top: 4px;
      height: 16px;
      line-height: 16px;
      font-size: 12px;
      color: @error-color;
    }
  }
}

.next-btn {
  background: linear-gradient(120deg, @primary-color, @heading-color);
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  height: 46px;
  line-height: 46px;
  text-align: center;
  width: 100%;
  outline: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  transition: all 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(76, 175, 80, 0.4);
  }

  &:active {
    transform: translateY(1px);
  }
}

button {
  background: transparent;
  padding: 0;
  border-width: 0px;
}

.operation {
  display: flex;
  flex-direction: row;
  margin: 24px 40px 0;
}

.forget-pwd {
  display: block;
  overflow: hidden;
  flex: 1;
  margin: 0 auto;
  color: @heading-color;
  font-size: 14px;
  cursor: pointer;
  position: relative;
  transition: all 0.3s;

  &:hover {
    color: @accent-color;

    &:after {
      width: 70%;
      background-color: @accent-color;
    }
  }

  &:after {
    content: "";
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 0;
    height: 1px;
    background-color: @heading-color;
    transition: all 0.3s;
  }
}

/* 开发工具样式 */
.dev-tools {
  margin: 20px 40px 0;
  text-align: center;
  padding-top: 10px;
  border-top: 1px dashed rgba(76, 175, 80, 0.3);
}

.dev-btn {
  background: linear-gradient(120deg, #ff9800, #f57c00);
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  height: 36px;
  line-height: 36px;
  padding: 0 16px;
  text-align: center;
  outline: none;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
  transition: all 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
  }

  &:active {
    transform: translateY(1px);
  }
}
</style>
