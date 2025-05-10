<template>
  <div class="edit-form">
    <a-form :form="form" layout="vertical">
      <a-form-item label="分类名称">
        <a-input
          v-decorator="[
            'name',
            {
              initialValue: formData.name,
              rules: [{ required: true, message: '请输入分类名称' }]
            }
          ]"
          placeholder="请输入分类名称"
        />
      </a-form-item>

      <a-form-item label="分类描述">
        <a-textarea
          v-decorator="[
            'description',
            {
              initialValue: formData.description
            }
          ]"
          placeholder="请输入分类描述"
          :rows="4"
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
import { createApi, updateApi } from "@/api/admin/classification";

export default {
  name: "EditClassification",
  props: {
    classification: {
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
        name: "",
        description: ""
      }
    };
  },
  created() {
    // 如果是编辑模式，填充表单
    if (this.modifyFlag && this.classification) {
      this.formData = {
        name: this.classification.name,
        description: this.classification.description
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
          name: values.name,
          description: values.description || null,
          parent: null // 单级分类，始终为null
        };

        // 根据模式决定创建或更新
        const request = this.modifyFlag
          ? updateApi(this.classification.id, submitData)
          : createApi(submitData);

        request
          .then(() => {
            this.$message.success(`${this.modifyFlag ? "修改" : "新增"}成功`);
            this.loading = false;
            this.$emit("ok");
            this.close();
          })
          .catch(err => {
            this.$message.error(
              (err.response && err.response.data && err.response.data.detail) ||
                `${this.modifyFlag ? "修改" : "新增"}失败`
            );
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
