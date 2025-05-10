<template>
  <a-form-model ref="myform" :model="form" :rules="rules">
    <a-row :gutter="24">
      <a-col span="24">
        <a-form-model-item label="商品名称" prop="name">
          <a-input placeholder="请输入商品名称" v-model="form.name"></a-input>
        </a-form-model-item>
      </a-col>
      <a-col span="24">
        <a-form-model-item label="分类" prop="category">
          <a-select
            v-model="form.category"
            style="width: 100%"
            placeholder="请选择分类"
            allow-clear
          >
            <a-select-option
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </a-select-option>
          </a-select>
        </a-form-model-item>
      </a-col>
      <a-col span="24">
        <a-form-model-item label="图片URL" prop="image_url">
          <a-input placeholder="请输入图片URL地址" v-model="form.image_url">
            <a-icon slot="prefix" type="picture" />
          </a-input>
          <div v-if="form.image_url" style="margin-top: 10px;">
            <img
              :src="form.image_url"
              style="max-width: 100%; max-height: 200px;"
            />
          </div>
        </a-form-model-item>
      </a-col>

      <a-col span="24">
        <a-form-model-item label="商品描述">
          <a-textarea
            placeholder="请输入商品描述"
            v-model="form.description"
            :rows="4"
          ></a-textarea>
        </a-form-model-item>
      </a-col>
      <a-col span="12">
        <a-form-model-item label="价格" prop="price">
          <a-input-number
            placeholder="请输入价格"
            :min="0"
            :step="0.01"
            v-model="form.price"
            style="width: 100%;"
          ></a-input-number>
        </a-form-model-item>
      </a-col>
      <a-col span="12">
        <a-form-model-item label="库存" prop="stock">
          <a-input-number
            placeholder="请输入库存"
            :min="0"
            v-model="form.stock"
            style="width: 100%;"
          ></a-input-number>
        </a-form-model-item>
      </a-col>
    </a-row>
  </a-form-model>
</template>

<script>
import { createApi, updateApi } from "@/api/admin/thing";
import { listApi as listCategoriesApi } from "@/api/admin/classification";

export default {
  name: "EditThing",
  props: {
    modifyFlag: {
      type: Boolean,
      default: () => false
    },
    thing: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      form: {
        name: "",
        category: undefined,
        description: "",
        price: 0,
        stock: 0,
        image_url: ""
      },
      rules: {
        name: [
          { required: true, message: "请输入商品名称", trigger: "change" }
        ],
        category: [
          { required: true, message: "请选择分类", trigger: "change" }
        ],
        price: [{ required: true, message: "请输入价格", trigger: "change" }],
        stock: [{ required: true, message: "请输入库存", trigger: "change" }]
      },
      categories: [],
      loading: false
    };
  },
  created() {
    // 获取分类列表
    this.getCategories();

    // 如果是编辑模式，加载数据
    if (this.modifyFlag && this.thing) {
      this.form = {
        name: this.thing.name || "",
        category: this.thing.category || undefined,
        description: this.thing.description || "",
        price: parseFloat(this.thing.price) || 0,
        stock: parseInt(this.thing.stock) || 0,
        image_url: this.thing.image_url || ""
      };
    }
  },
  methods: {
    // 获取分类列表
    getCategories() {
      this.loading = true;

      // 获取当前登录用户信息
      const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
      const params = {};

      // 如果不是超级管理员，则添加商户ID过滤
      if (
        userInfo.id &&
        userInfo.is_superuser !== "1" &&
        userInfo.is_superuser !== 1
      ) {
        params.merchant_id = userInfo.id;
      }

      listCategoriesApi(params)
        .then(res => {
          // 处理分页格式的分类数据
          const categoryData = res.results || res;
          this.categories = categoryData.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            parent: item.parent
          }));
          this.loading = false;
        })
        .catch(err => {
          this.$message.error("获取分类失败: " + (err.message || "未知错误"));
          this.loading = false;
        });
    },

    // 提交表单
    onOk() {
      return new Promise((resolve, reject) => {
        this.$refs.myform.validate(valid => {
          if (valid) {
            // 准备提交的数据
            const data = {
              name: this.form.name,
              description: this.form.description || "",
              price: this.form.price,
              stock: this.form.stock,
              category: this.form.category,
              image_url: this.form.image_url || ""
            };

            if (this.modifyFlag) {
              // 修改接口
              updateApi(this.thing.id, data)
                .then(res => {
                  this.$message.success("商品更新成功");
                  resolve(res);
                })
                .catch(err => {
                  this.$message.error(
                    "更新失败: " + (err.message || "未知错误")
                  );
                  reject(err);
                });
            } else {
              // 新增接口
              createApi(data)
                .then(res => {
                  this.$message.success("商品添加成功");
                  resolve(res);
                })
                .catch(err => {
                  this.$message.error(
                    "添加失败: " + (err.message || "未知错误")
                  );
                  reject(err);
                });
            }
          } else {
            reject(new Error("表单验证失败"));
          }
        });
      });
    }
  }
};
</script>
