<template>
  <div class="admin-categories">
    <a-card title="分类管理" :bordered="false">
      <!-- 操作按钮 -->
      <div class="table-operations">
        <a-button type="primary" icon="plus" @click="handleAdd"
          >新增分类</a-button
        >
      </div>

      <!-- 表格 -->
      <s-table
        ref="table"
        size="default"
        rowKey="id"
        :columns="columns"
        :data="loadData"
        :alert="false"
        showPagination="auto"
      >
        <span slot="action" slot-scope="text, record">
          <a @click="handleEdit(record)">编辑</a>
          <a-divider type="vertical" />
          <a-popconfirm
            title="确定要删除此分类吗？"
            ok-text="确定"
            cancel-text="取消"
            @confirm="handleDelete(record)"
          >
            <a>删除</a>
          </a-popconfirm>
        </span>
      </s-table>
    </a-card>

    <!-- 新增/编辑分类表单 -->
    <a-modal
      :title="modalTitle"
      :visible="modalVisible"
      :confirmLoading="modalLoading"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
    >
      <a-form :form="form">
        <a-form-item
          label="分类名称"
          :labelCol="{ span: 6 }"
          :wrapperCol="{ span: 14 }"
        >
          <a-input
            v-decorator="[
              'name',
              {
                rules: [{ required: true, message: '请输入分类名称' }]
              }
            ]"
            placeholder="请输入分类名称"
          />
        </a-form-item>
        <a-form-item
          label="分类描述"
          :labelCol="{ span: 6 }"
          :wrapperCol="{ span: 14 }"
        >
          <a-textarea
            v-decorator="['description']"
            :rows="4"
            placeholder="请输入分类描述"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { STable } from "@/components";
import merchantCategories from "@/api/admin/merchant-categories";

export default {
  name: "AdminCategories",
  components: {
    STable
  },
  data() {
    return {
      // 表格列定义
      columns: [
        {
          title: "ID",
          dataIndex: "id"
        },
        {
          title: "分类名称",
          dataIndex: "name"
        },
        {
          title: "描述",
          dataIndex: "description"
        },
        {
          title: "商品数量",
          dataIndex: "product_count"
        },
        {
          title: "操作",
          dataIndex: "action",
          width: "150px",
          scopedSlots: { customRender: "action" }
        }
      ],
      // 表单
      form: this.$form.createForm(this),
      // 模态框
      modalVisible: false,
      modalLoading: false,
      modalTitle: "新增分类",
      currentRecord: null
    };
  },
  methods: {
    // 加载表格数据
    loadData(parameter) {
      return merchantCategories.getCategories(parameter).then(res => {
        return {
          pageSize: res.limit,
          pageNo: res.page,
          totalCount: res.total,
          totalPage: res.pages,
          data: res.items
        };
      });
    },
    // 新增分类
    handleAdd() {
      this.modalTitle = "新增分类";
      this.currentRecord = null;
      this.form.resetFields();
      this.modalVisible = true;
    },
    // 编辑分类
    handleEdit(record) {
      this.modalTitle = "编辑分类";
      this.currentRecord = record;
      this.form.resetFields();
      this.$nextTick(() => {
        this.form.setFieldsValue({
          name: record.name,
          description: record.description
        });
      });
      this.modalVisible = true;
    },
    // 删除分类
    handleDelete(record) {
      merchantCategories
        .deleteCategory(record.id)
        .then(() => {
          this.$message.success("删除成功");
          this.$refs.table.refresh();
        })
        .catch(err => {
          this.$message.error(err.response?.data?.message || "删除失败");
        });
    },
    // 模态框确认
    handleModalOk() {
      this.form.validateFields((err, values) => {
        if (err) return;

        this.modalLoading = true;

        if (this.currentRecord) {
          // 更新分类
          merchantCategories
            .updateCategory(this.currentRecord.id, values)
            .then(() => {
              this.$message.success("更新成功");
              this.modalVisible = false;
              this.$refs.table.refresh();
            })
            .catch(err => {
              this.$message.error(err.response?.data?.message || "更新失败");
            })
            .finally(() => {
              this.modalLoading = false;
            });
        } else {
          // 新增分类
          merchantCategories
            .createCategory(values)
            .then(() => {
              this.$message.success("新增成功");
              this.modalVisible = false;
              this.$refs.table.refresh();
            })
            .catch(err => {
              this.$message.error(err.response?.data?.message || "新增失败");
            })
            .finally(() => {
              this.modalLoading = false;
            });
        }
      });
    },
    // 模态框取消
    handleModalCancel() {
      this.modalVisible = false;
    }
  }
};
</script>

<style lang="less" scoped>
.admin-categories {
  .table-operations {
    margin-bottom: 16px;
  }
}
</style>
