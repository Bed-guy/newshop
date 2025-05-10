<template>
  <div>
    <a-card :bordered="false">
      <div class="table-page-search-wrapper">
        <a-form layout="inline">
          <a-row :gutter="48">
            <a-col :md="8" :sm="24">
              <a-form-item label="关键词">
                <a-input
                  v-model="queryParam.search"
                  placeholder="用户名/邮箱"
                />
              </a-form-item>
            </a-col>
            <a-col :md="8" :sm="24">
              <span class="table-page-search-submitButtons">
                <a-button type="primary" @click="getList">查询</a-button>
                <a-button
                  style="margin-left: 8px"
                  @click="() => (queryParam = {})"
                  >重置</a-button
                >
              </span>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="table-operator">
        <a-button type="primary" icon="plus" @click="handleAdd">新增</a-button>
      </div>

      <a-table
        :columns="columns"
        :rowKey="record => record.id"
        :dataSource="list"
        :pagination="pagination"
        :loading="loading"
        @change="handleTableChange"
      >
        <span slot="status" slot-scope="text">
          <a-badge :status="text ? 'success' : 'error'" />
          {{ text ? "启用" : "禁用" }}
        </span>
        <span slot="action" slot-scope="text, record">
          <template>
            <a @click="handleEdit(record)">编辑</a>
            <a-divider type="vertical" />
            <a-popconfirm
              v-if="record.username !== 'admin' && record.id !== 11"
              title="确定删除此商户吗?"
              ok-text="确定"
              cancel-text="取消"
              @confirm="handleDelete(record)"
            >
              <a>删除</a>
            </a-popconfirm>
            <a
              v-else
              style="color: #ccc; cursor: not-allowed"
              title="不能删除管理员账户"
              >删除</a
            >
          </template>
        </span>
      </a-table>

      <!-- 新增/编辑表单 -->
      <a-modal
        :title="modalTitle"
        :visible="visible"
        :confirmLoading="confirmLoading"
        @ok="handleOk"
        @cancel="handleCancel"
      >
        <a-form :form="form">
          <a-form-item
            label="用户名"
            :labelCol="labelCol"
            :wrapperCol="wrapperCol"
          >
            <a-input
              v-decorator="[
                'username',
                {
                  rules: [{ required: true, message: '请输入用户名!' }]
                }
              ]"
              placeholder="请输入用户名"
            />
          </a-form-item>
          <a-form-item
            label="密码"
            :labelCol="labelCol"
            :wrapperCol="wrapperCol"
          >
            <a-input-password
              v-decorator="[
                'password',
                {
                  rules: [
                    { required: formType === 'add', message: '请输入密码!' }
                  ]
                }
              ]"
              placeholder="请输入密码"
            />
            <span v-if="formType === 'edit'" style="color: #999"
              >不修改密码请留空</span
            >
          </a-form-item>
          <a-form-item
            label="邮箱"
            :labelCol="labelCol"
            :wrapperCol="wrapperCol"
          >
            <a-input
              v-decorator="[
                'email',
                {
                  rules: [{ type: 'email', message: '请输入有效的邮箱地址!' }]
                }
              ]"
              placeholder="请输入邮箱"
            />
          </a-form-item>
          <a-form-item
            label="状态"
            :labelCol="labelCol"
            :wrapperCol="wrapperCol"
          >
            <a-switch
              v-decorator="[
                'is_active',
                {
                  valuePropName: 'checked',
                  initialValue: true
                }
              ]"
              checkedChildren="启用"
              unCheckedChildren="禁用"
            />
          </a-form-item>
        </a-form>
      </a-modal>
    </a-card>
  </div>
</template>

<script>
import { listApi, createApi, updateApi, deleteApi } from "@/api/admin/merchant";

export default {
  name: "MerchantList",
  data() {
    return {
      // 查询参数
      queryParam: {},
      // 表格列定义
      columns: [
        {
          title: "ID",
          dataIndex: "id"
        },
        {
          title: "用户名",
          dataIndex: "username"
        },
        {
          title: "邮箱",
          dataIndex: "email"
        },
        {
          title: "状态",
          dataIndex: "is_active",
          scopedSlots: { customRender: "status" }
        },
        {
          title: "注册时间",
          dataIndex: "date_joined",
          sorter: true
        },
        {
          title: "操作",
          dataIndex: "action",
          scopedSlots: { customRender: "action" }
        }
      ],
      // 表格数据
      list: [],
      // 分页配置
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0,
        showSizeChanger: true,
        showTotal: total => `共 ${total} 条`
      },
      // 加载状态
      loading: false,
      // 模态框配置
      visible: false,
      confirmLoading: false,
      formType: "add", // 'add' 或 'edit'
      currentRecord: null,
      form: this.$form.createForm(this),
      labelCol: { span: 4 },
      wrapperCol: { span: 20 }
    };
  },
  computed: {
    modalTitle() {
      return this.formType === "add" ? "新增商户" : "编辑商户";
    }
  },
  mounted() {
    this.getList();
  },
  methods: {
    // 获取商户列表
    getList() {
      this.loading = true;
      const params = {
        page: this.pagination.current,
        page_size: this.pagination.pageSize,
        ...this.queryParam
      };

      listApi(params)
        .then(response => {
          this.list = response.results;
          this.pagination.total = response.total;
        })
        .finally(() => {
          this.loading = false;
        });
    },

    // 表格变化事件
    handleTableChange(pagination, filters, sorter) {
      this.pagination.current = pagination.current;
      this.pagination.pageSize = pagination.pageSize;
      if (sorter.field) {
        this.queryParam.ordering =
          sorter.order === "descend" ? `-${sorter.field}` : sorter.field;
      } else {
        this.queryParam.ordering = null;
      }
      this.getList();
    },

    // 新增商户
    handleAdd() {
      this.formType = "add";
      this.visible = true;
      this.form.resetFields();
    },

    // 编辑商户
    handleEdit(record) {
      this.formType = "edit";
      this.currentRecord = record;
      this.visible = true;
      this.$nextTick(() => {
        this.form.setFieldsValue({
          username: record.username,
          email: record.email,
          is_active: record.is_active
        });
      });
    },

    // 删除商户
    handleDelete(record) {
      // 再次检查是否是admin账户，防止绕过前端限制
      if (record.username === "admin" || record.id === 11) {
        this.$message.error("不能删除管理员账户");
        return;
      }

      this.loading = true;
      deleteApi(record.id)
        .then(() => {
          this.$message.success("删除成功");
          this.getList();
        })
        .catch(error => {
          this.$message.error(`删除失败: ${error.message}`);
        })
        .finally(() => {
          this.loading = false;
        });
    },

    // 提交表单
    handleOk() {
      this.form.validateFields((err, values) => {
        if (err) return;

        this.confirmLoading = true;
        const formData = { ...values };

        // 如果是编辑模式且密码为空，则删除密码字段
        if (this.formType === "edit" && !formData.password) {
          delete formData.password;
        }

        const request =
          this.formType === "add"
            ? createApi(formData)
            : updateApi(this.currentRecord.id, formData);

        request
          .then(() => {
            this.$message.success(
              `${this.formType === "add" ? "新增" : "编辑"}成功`
            );
            this.visible = false;
            this.getList();
          })
          .catch(error => {
            this.$message.error(`操作失败: ${error.message}`);
          })
          .finally(() => {
            this.confirmLoading = false;
          });
      });
    },

    // 取消表单
    handleCancel() {
      this.visible = false;
    }
  }
};
</script>
