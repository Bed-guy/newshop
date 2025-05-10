<template>
  <div class="container">
    <div class="tel-regist-page pc-style">
      <div class="regist-title">
        <span>注册新账号</span>
        <span @click="$router.push({ name: 'login' })" class="toWxLogin"
          >我要登录</span
        >
      </div>

      <div class="regist-padding">
        <div class="common-input">
          <img src="@/assets/images/mail-icon.svg" class="left-icon" />
          <div class="input-view">
            <input
              placeholder="请输入邮箱"
              v-model="loginForm.username"
              type="text"
              class="input"
            />
            <p class="err-view">
              {{ errors.username }}
            </p>
          </div>
        </div>
      </div>
      <div class="regist-padding">
        <div class="common-input">
          <img src="@/assets/images/pwd-icon.svg" class="left-icon" />
          <div class="input-view">
            <input
              placeholder="请输入密码"
              v-model="loginForm.password"
              type="password"
              class="input"
            />
            <p class="err-view">
              {{ errors.password }}
            </p>
          </div>
        </div>
      </div>
      <div class="regist-padding">
        <div class="common-input">
          <img src="@/assets/images/pwd-icon.svg" class="left-icon" />
          <div class="input-view">
            <input
              placeholder="请再次输入密码"
              v-model="loginForm.repassword"
              type="password"
              class="input"
            />
            <p class="err-view">
              {{ errors.repassword }}
            </p>
          </div>
        </div>
      </div>
      <div class="tel-login">
        <div class="next-btn-view">
          <button class="next-btn" @click="handleRegister" :disabled="loading">
            {{ loading ? "注册中..." : "注册" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { registerApi } from "../../api/auth";
import axios from "axios";

export default {
  name: "Register",
  data() {
    return {
      baseUrl: "http://localhost:8000",

      loginForm: {
        username: "",
        password: "",

        repassword: ""
      },
      errors: {
        username: "",
        password: "",
        repassword: ""
      },
      loading: false
    };
  },
  methods: {
    // 验证表单
    validateForm() {
      let valid = true;
      this.errors = {
        username: "",
        password: "",
        repassword: ""
      };

      // 验证邮箱
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!this.loginForm.username) {
        this.errors.username = "请输入邮箱";
        valid = false;
      } else if (!emailRegex.test(this.loginForm.username)) {
        this.errors.username = "请输入有效的邮箱地址";
        valid = false;
      }

      // 验证密码
      if (!this.loginForm.password) {
        this.errors.password = "请输入密码";
        valid = false;
      } else if (this.loginForm.password.length < 6) {
        this.errors.password = "密码至少需要6个字符";
        valid = false;
      }

      // 验证两次密码是否一致
      if (!this.loginForm.repassword) {
        this.errors.repassword = "请再次输入密码";
        valid = false;
      } else if (this.loginForm.password !== this.loginForm.repassword) {
        this.errors.repassword = "两次输入的密码不一致";
        valid = false;
      }

      return valid;
    },

    // 处理注册
    handleRegister() {
      if (!this.validateForm()) {
        return;
      }

      this.loading = true;

      axios
        .post(`${this.baseUrl}/api/auth/register/`, {
          username: this.loginForm.username,
          password: this.loginForm.password
        })

        .then(res => {
          this.$message.success("注册成功！");
          this.$router.push({ name: "login" });
        })
        .catch(err => {
          console.error("注册失败:", err);

          // 处理后端返回的错误
          if (err.response && err.response.data) {
            const data = err.response.data;

            // 处理用户名已存在的情况
            if (data.username) {
              this.errors.username = Array.isArray(data.username)
                ? data.username[0]
                : data.username;
            }

            // 处理邮箱错误
            if (data.email) {
              this.errors.username = Array.isArray(data.email)
                ? data.email[0]
                : data.email;
            }

            // 处理密码错误
            if (data.password) {
              this.errors.password = Array.isArray(data.password)
                ? data.password[0]
                : data.password;
            }

            // 处理通用错误
            if (data.non_field_errors) {
              this.$message.error(
                Array.isArray(data.non_field_errors)
                  ? data.non_field_errors[0]
                  : data.non_field_errors
              );
            }
          } else {
            this.$message.error(err.message || "注册失败，请稍后重试");
          }
        })
        .finally(() => {
          this.loading = false;
        });
    }
  }
};
</script>

<style scoped lang="less">
@primary-color: #4caf50;
@heading-color: #2e7d32;
@text-color: #33691e;
@border-color: #aed581;
@background-light: #f1f8e9;
@accent-color: #ff8f00;
@error-color: #e53935;

div {
  display: block;
}

*,
:after,
:before {
  box-sizing: border-box;
}

.container {
  max-width: 100%;
  background-image: url("~@/assets/images/login.png");
  background-size: cover;
  background-position: center;
  height: 100vh;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;

  /* 添加半透明叠加层 */
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

.pc-style {
  position: relative;
  width: 400px;
  min-height: 480px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1), 0 8px 12px rgba(76, 175, 80, 0.1);
  z-index: 1;

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

.tel-regist-page {
  overflow: hidden;

  .regist-title {
    font-size: 18px;
    color: @heading-color;
    font-weight: 600;
    height: 28px;
    line-height: 28px;
    margin: 40px 0;
    padding: 0 40px;
    position: relative;

    &::after {
      content: "";
      position: absolute;
      bottom: -8px;
      left: 40px;
      width: 30px;
      height: 2px;
      background-color: @primary-color;
      border-radius: 2px;
    }

    .toWxLogin {
      color: @accent-color;
      float: right;
      cursor: pointer;
      transition: all 0.3s;
      position: relative;

      &:hover {
        color: darken(@accent-color, 10%);

        &::after {
          width: 100%;
        }
      }

      &::after {
        content: "";
        position: absolute;
        bottom: -2px;
        left: 0;
        width: 0;
        height: 1px;
        background-color: @accent-color;
        transition: width 0.3s;
      }
    }
  }

  .regist-padding {
    padding: 0 40px;
    margin-bottom: 20px;
    position: relative;

    &::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 64px; /* 图标宽度(24px) + 左右间距 */
      right: 40px;
      height: 1px;
      background: linear-gradient(to right, @border-color 0%, transparent 100%);
    }
  }
}

.common-input {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;

  .left-icon {
    margin-right: 16px;
    width: 24px;
    height: 24px;
    object-fit: contain;
    filter: invert(39%) sepia(64%) saturate(591%) hue-rotate(67deg)
      brightness(93%) contrast(89%);
    transition: transform 0.3s;
  }

  &:hover .left-icon {
    transform: scale(1.1);
  }

  .input-view {
    flex: 1;

    .input {
      font-weight: 500;
      font-size: 15px;
      color: @text-color;
      height: 32px;
      line-height: 32px;
      padding: 0 0 4px;
      display: block;
      width: 100%;
      letter-spacing: 0.5px;
      transition: all 0.3s;
      background: transparent;
      border-bottom: 1px solid transparent;
      outline: none;

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
      transition: all 0.3s;
    }
  }
}

.tel-login {
  padding: 8px 40px 0;

  .next-btn-view {
    padding-top: 12px;
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
  border: none;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(76, 175, 80, 0.4);
  }

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    background: #a5d6a7;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
}

/* 添加输入框动画效果 */
.input-view {
  position: relative;

  &::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: 0;
    width: 0;
    height: 2px;
    background-color: @primary-color;
    transition: width 0.3s ease;
  }

  &:focus-within::after {
    width: 100%;
  }
}

/* 添加表单提交成功的动画准备 */
@keyframes success-wave {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

/* 添加装饰元素 */
.tel-regist-page::after {
  content: "";
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234caf50" opacity="0.2"><path d="M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.96-0.36-1.86-1-2.58c0.01-0.21,0-0.43,0-0.64c0-4.97-4.03-9-9-9 C12,1.82,12,2.32,12,3z"></path></svg>');
  background-repeat: no-repeat;
  background-size: contain;
  opacity: 0.1;
}
</style>
