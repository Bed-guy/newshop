<template>
  <div class="page-view">
    <div class="table-operation">
      <a-space>
        <a-button type="primary" @click="handleAdd(-1)">新增</a-button>
        <!-- <a-button @click="handleBatchDelete">批量删除</a-button> -->
      </a-space>
    </div>
    <div class="table-wrap" ref="tableWrap">
      <a-table
        size="middle"
        rowKey="key"
        :loading="loading"
        :columns="columns"
        :data-source="data"
        :scroll="{ x: 'max-content' }"
        :row-selection="rowSelection()"
        :pagination="{
          size: 'default',
          current: page,
          pageSize: pageSize,
          onChange: current => (page = current),
          total: total, // 添加这一行
          pageSizeOptions: ['10', '20', '30', '40'],
          showSizeChanger: true,
          showTotal: total => `共${total}条数据`
        }"
      >
        <span slot="description" slot-scope="text">{{ text || "-" }}</span>
        <span slot="operation" class="operation" slot-scope="text, record">
          <a-space :size="16">
            <a @click="handleEdit(record)">编辑</a>
            <a @click="handleDelete(record)">删除</a>
          </a-space>
        </span>
      </a-table>
    </div>
  </div>
</template>

<script>
import { listApi, deleteApi } from "@/api/admin/classification";
import EditClassification from "@/views/admin/model/edit-classification";

// 修改列定义
const columns = [
  {
    title: "分类名称",
    dataIndex: "name",
    key: "name"
  },
  {
    title: "描述",
    dataIndex: "description",
    key: "description",
    scopedSlots: { customRender: "description" }
  },
  {
    title: "操作",
    dataIndex: "action",
    align: "right",
    fixed: "right",
    width: 120,
    scopedSlots: { customRender: "operation" }
  }
];

export default {
  name: "Classification",
  data() {
    return {
      loading: false,
      selectedRowKeys: [],
      columns,
      data: [],
      pageSize: 10,
      page: 1,
      total: 0 // 添加total属性
    };
  },
  methods: {
    // 优化 getList 方法
    getList() {
      this.loading = true;
      listApi()
        .then(res => {
          this.loading = false;

          // 直接使用返回的数组
          const dataList = Array.isArray(res) ? res : res.results || [];

          // 转换数据结构以适配前端组件
          this.data = this.transformCategoryData(dataList);

          // 更新总记录数，用于分页
          if (res.count !== undefined) {
            this.total = res.count;
          } else {
            this.total = dataList.length;
          }
        })
        .catch(err => {
          this.loading = false;
          this.$message.error(
            (err.response && err.response.data && err.response.data.detail) ||
              "获取分类列表失败"
          );
        });
    },
    // 替换 transformCategoryData 方法为简化版本
    transformCategoryData(categories) {
      // 处理一级分类的简单转换
      return categories.map(category => {
        return {
          key: category.id.toString(),
          id: category.id,
          name: category.name,
          description: category.description || "",
          parent: category.parent, // 应该始终为null
          isParent: false, // 没有子分类，所以都是false
          children: [] // 空数组，因为没有子分类
        };
      });
    },

    rowSelection() {
      return {
        onChange: (selectedRowKeys, selectedRows) => {
          this.selectedRowKeys = selectedRowKeys;
        },
        onSelect: (record, selected, selectedRows) => {
          console.log(record, selected, selectedRows);
        }
      };
    },
    handleAdd(pid) {
      this.$dialog(
        EditClassification,
        {
          pid: pid,
          on: {
            ok: () => {
              this.page = 1;
              this.getList();
            }
          }
        },
        {
          title: "新增分类",
          width: "480px",
          centered: true,
          bodyStyle: {
            maxHeight: "calc(100vh - 200px)",
            overflowY: "auto"
          }
        }
      );
    },
    handleEdit(record) {
      this.$dialog(
        EditClassification,
        {
          classification: Object.assign({}, record),
          modifyFlag: true,
          on: {
            ok: () => {
              this.getList();
            }
          }
        },
        {
          title: "编辑分类",
          width: "480px",
          centered: true,
          bodyStyle: {
            maxHeight: "calc(100vh - 200px)",
            overflowY: "auto"
          }
        }
      );
    },
    // 删除
    handleDelete(record) {
      const that = this;
      this.$confirm({
        title: "确定删除?",
        content: "该分类下的商品也会被删除！",
        onOk() {
          deleteApi({
            ids: record.key
          })
            .then(res => {
              that.$message.success("删除成功");
              that.getList();
            })
            .catch(err => {
              that.$message.error(err.msg || "删除失败");
            });
        }
      });
    },
    // 批量删除
    handleBatchDelete() {
      console.log(this.selectedRowKeys);
      if (this.selectedRowKeys.length <= 0) {
        this.$message.warn("请勾选删除项");
        return;
      }
      const that = this;
      this.$confirm({
        title: "确定删除?",
        content: "该分类下的商品也会被删除！",
        onOk() {
          deleteApi({
            ids: that.selectedRowKeys.join(",")
          })
            .then(res => {
              that.$message.success("删除成功");
              that.selectedRowKeys = [];
              that.getList();
            })
            .catch(err => {
              that.$message.error(err.msg || "删除失败");
            });
        }
      });
    }
  },
  mounted() {
    this.getList();
  }
};
</script>

<style lang="less" scoped>
.table-wrap {
  flex: 1;
}
.page-view {
  min-height: 100%;
  background: #fff;
  padding: 24px;
  display: flex;
  flex-direction: column;
}
.table-operation {
  height: 50px;
  text-align: right;
}
</style>
