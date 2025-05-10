<template>
  <div class="edit-form">
    <a-form :form="form" layout="vertical">
      <a-form-item label="用户名">
        <a-input
          v-decorator="[
            'username',
            {
              initialValue: formData.username,
              rules: [{ required: true, message: '请输入用户名' }]
            }
          ]"
          placeholder="请输入用户名"
          :disabled="modifyFlag"
        />
        <small>* 用户名也将用作显示名称</small>
      </a-form-item>

      <a-form-item label="密码" v-if="!modifyFlag">
        <a-input-password
          v-decorator="[
            'password',
            {
              rules: [{ required: true, message: '请输入密码' }]
            }
          ]"
          placeholder="请输入密码"
        />
      </a-form-item>

      <a-form-item label="邮箱">
        <a-input
          v-decorator="[
            'email',
            {
              initialValue: formData.email,
              rules: [{ type: 'email', message: '请输入正确的邮箱格式!' }]
            }
          ]"
          placeholder="请输入邮箱"
        />
      </a-form-item>
    </a-form>

    <div class="action-buttons">
      <a-button @click="close">取消</a-button>
      <a-button type="primary" @click="handleSubmit" :loading="loading"
        >确定</a-button
      >
    </div>
  </div>
</template>

<script>
import { createApi, updateApi } from "@/api/admin/user";

export default {
  name: "EditUser",
  props: {
    user: {
      type: Object,
      default: () => ({})
    },
    modifyFlag: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      form: this.$form.createForm(this),
      loading: false,
      formData: {
        username: "",
        email: "",
        first_name: "",
        is_staff: false,
        is_active: true,
        is_superuser: false
      }
    };
  },
  created() {
    // 如果是编辑模式，填充表单数据
    if (this.modifyFlag && this.user) {
      this.formData = {
        username: this.user.username,
        email: this.user.email,
        first_name: this.user.nickname,
        is_staff: this.user.role === "1",
        is_active: this.user.status === "0",
        is_superuser: Boolean(this.user.is_superuser)
      };
    }
  },
  methods: {
    handleSubmit() {
      this.form.validateFields((err, values) => {
        if (err) return;

        this.loading = true;

        // 构造提交数据
        const submitData = {
          username: values.username,
          email: values.email || "",
          first_name: values.first_name || "",
          is_staff: values.is_staff,
          is_active: values.is_active,
          is_superuser: values.is_superuser
        };

        // 新增用户时需要密码
        if (!this.modifyFlag) {
          submitData.password = values.password;
        }

        console.log("提交的用户数据:", submitData);

        // 根据模式决定创建或更新
        const request = this.modifyFlag
          ? updateApi(this.user.id, submitData)
          : createApi(submitData);

        request
          .then(response => {
            console.log("API请求成功:", response);
            this.$message.success(`${this.modifyFlag ? "修改" : "新增"}成功`);
            this.loading = false;
            this.$emit("ok");
            this.close();
          })
          .catch(err => {
            console.error("API请求失败:", err);
            // 显示更详细的错误信息
            let errorMessage;
            if (err.response) {
              console.error("错误状态:", err.response.status);
              console.error("错误数据:", err.response.data);

              if (err.response.status === 405) {
                errorMessage = "此接口不支持该操作，请检查API配置";
              } else {
                errorMessage =
                  err.response.data && typeof err.response.data === "object"
                    ? JSON.stringify(err.response.data)
                    : err.response.data;
              }
            } else {
              errorMessage =
                err.message || `${this.modifyFlag ? "修改" : "新增"}失败`;
            }

            this.$message.error(errorMessage);
            this.loading = false;
          });
      });
    },
    close() {
      this.$emit("close");
    }
  }
};
</script>

<style scoped>
.action-buttons {
  text-align: right;
  margin-top: 20px;
}

.action-buttons button {
  margin-left: 8px;
}
</style>
