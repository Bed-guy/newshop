<template>
  <div class="page-view">
    <div class="table-operation">
      <a-space>
        <a-button type="primary" @click="handleAdd">新增</a-button>
        <a-input-search
          addon-before="商品"
          enter-button
          @search="onSearch"
          @change="onSearchChange"
        />
      </a-space>
    </div>
    <div class="table-wrap" ref="tableWrap">
      <a-table
        size="middle"
        rowKey="id"
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
          pageSizeOptions: ['10', '20', '30', '40'],
          showSizeChanger: true,
          showTotal: total => `共${total}条数据`
        }"
      >
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
import { listApi, deleteApi, createApi } from "@/api/admin/thing";
import EditThing from "@/views/admin/model/edit-thing";

const columns = [
  {
    title: "序号",
    dataIndex: "index",
    key: "index",
    width: 60
  },
  {
    title: "名称",
    dataIndex: "name",
    key: "name"
  },
  {
    title: "封面",
    dataIndex: "image_url",
    key: "image_url",
    scopedSlots: { customRender: "image_url" }
  },
  {
    title: "价格",
    dataIndex: "price",
    key: "price"
  },

  {
    title: "简介",
    dataIndex: "description",
    key: "description",
    customRender: text => (text ? text.substring(0, 10) + "..." : "--")
  },
  {
    title: "操作",
    dataIndex: "action",
    align: "center",
    fixed: "right",
    width: 140,
    scopedSlots: { customRender: "operation" }
  }
];

export default {
  name: "Thing",
  data() {
    return {
      loading: false,
      selectedRowKeys: [],
      columns,
      data: [],
      keyword: undefined,
      pageSize: 10,
      page: 1
    };
  },
  methods: {
    getList() {
      this.loading = true;

      // 构建查询参数
      const params = {};
      if (this.keyword) {
        params.search = this.keyword; // Django DRF 使用 search 参数进行搜索
      }

      // 分页参数 (如果Django API支持分页)
      params.page = this.page;
      params.page_size = this.pageSize;

      // 获取当前登录用户信息
      const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
      // 如果不是超级管理员，则添加商户ID过滤
      if (
        userInfo.id &&
        userInfo.is_superuser !== "1" &&
        userInfo.is_superuser !== 1
      ) {
        params.merchant_id = userInfo.id;
      }

      listApi(params)
        .then(res => {
          this.loading = false;

          // 处理返回数据
          // 如果返回的是分页格式 {count, results}
          let dataList = res.results || res; // 适配可能的分页结构

          // 如果是直接返回的数组
          if (Array.isArray(res)) {
            dataList = res;
          }

          // 映射数据字段
          this.data = dataList.map((item, index) => {
            return {
              id: item.id,
              index: (this.page - 1) * this.pageSize + index + 1,
              name: item.name,
              description: item.description,
              price: item.price,
              repertory: item.stock, // Django API返回的是 stock 而不是 repertory
              status: item.is_active ? "0" : "1", // 假设Django API有is_active表示上下架
              image_url: item.image_url,
              category_id: item.category,
              category_name: item.category_name
            };
          });

          // 如果有分页数据，更新总数
          if (res.count !== undefined) {
            this.total = res.count;
          }

          console.log("商品列表数据:", this.data);
        })
        .catch(err => {
          this.loading = false;
        });
    },

    onSearchChange(e) {
      this.keyword = e.target.value;
    },
    onSearch(value) {
      this.getList();
    },
    rowSelection() {
      return {
        onChange: (selectedRowKeys, selectedRows) => {
          this.selectedRowKeys = selectedRowKeys;
        }
      };
    },
    handleAdd() {
      this.$dialog(
        EditThing,
        {
          on: {
            ok: () => {
              this.page = 1;
              this.getList();
            }
          }
        },
        {
          title: "新增商品",
          width: "640px",
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
        EditThing,
        {
          thing: record, // 直接传递记录，不需要转换
          modifyFlag: true,
          on: {
            ok: () => {
              this.getList();
            }
          }
        },
        {
          title: "编辑商品",
          width: "640px",
          centered: true,
          bodyStyle: {
            maxHeight: "calc(100vh - 200px)",
            overflowY: "auto"
          }
        }
      );
    },
    // 单个删除
    handleDelete(record) {
      this.$confirm({
        title: "确定删除此商品?",
        content: "删除后数据无法恢复",
        onOk: () => {
          deleteApi({
            ids: String(record.id) // 确保是字符串
          })
            .then(() => {
              this.$message.success("删除成功");
              this.getList();
            })
            .catch(err => {
              this.$message.error(err.message || "删除失败");
            });
        }
      });
    },

    // 批量删除
    handleBatchDelete() {
      if (!this.selectedRows.length) {
        this.$message.warning("请选择要删除的商品");
        return;
      }

      this.$confirm({
        title: `确定删除选中的${this.selectedRows.length}个商品?`,
        content: "删除后数据无法恢复",
        onOk: () => {
          const ids = this.selectedRows.map(item => item.id).join(",");
          deleteApi({
            ids: ids // 已经是逗号分隔的字符串
          })
            .then(() => {
              this.$message.success("批量删除成功");
              this.selectedRows = [];
              this.selectedRowKeys = [];
              this.fetchData();
            })
            .catch(err => {
              this.$message.error(err.message || "批量删除失败");
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
