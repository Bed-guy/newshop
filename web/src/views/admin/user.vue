<template>
  <div class="page-view">
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
import { listApi, deleteApi } from "@/api/admin/user";
import EditUser from "@/views/admin/model/edit-user";
import EditPassword from "@/views/admin/model/edit-password";

const columns = [
  {
    title: "序号",
    dataIndex: "index",
    key: "index",
    align: "center"
  },
  {
    title: "用户名",
    dataIndex: "username",
    key: "username",
    align: "center"
  },
  {
    title: "昵称",
    dataIndex: "nickname",
    key: "nickname",
    align: "center"
  },
  {
    title: "角色",
    dataIndex: "role",
    key: "role",
    align: "center",
    scopedSlots: { customRender: "role" }
  },
  {
    title: "状态",
    dataIndex: "status",
    key: "status",
    align: "center",
    customRender: text => (text === "0" ? "正常" : "封号")
  },
  {
    title: "邮箱",
    dataIndex: "email",
    key: "email",
    align: "center"
  },
  {
    title: "手机号",
    dataIndex: "mobile",
    key: "mobile",
    align: "center"
  },
  {
    title: "创建时间",
    dataIndex: "create_time",
    key: "create_time",
    align: "center"
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
  name: "User",
  data() {
    return {
      loading: false,
      currentAdminUserName: "",
      keyword: "",
      selectedRowKeys: [],
      columns,
      data: [],
      pageSize: 10,
      page: 1
    };
  },
  methods: {
    // 修改 getList 方法
    getList() {
      this.loading = true;

      const params = {};
      if (this.keyword) {
        params.search = this.keyword; // 使用search参数搜索
      }

      // 分页参数
      params.page = this.page;
      params.page_size = this.pageSize;

      console.log("获取用户列表，参数:", params);

      listApi(params)
        .then(res => {
          this.loading = false;
          console.log("获取用户列表成功:", res);

          // 处理分页或直接数组数据
          let dataList = Array.isArray(res) ? res : res.results || [];

          // 转换数据结构以适配前端组件
          this.data = dataList.map((item, index) => {
            return {
              id: item.id,
              index: (this.page - 1) * this.pageSize + index + 1,
              username: item.username,
              nickname: item.first_name || "--", // Django 用户模型可能没有 nickname 字段
              email: item.email || "--",
              mobile: item.phone_number || "--", // 可能需要调整字段名
              status: item.is_active ? "0" : "1", // 0表示正常，1表示封号
              role: item.is_staff ? "1" : "2", // 1表示管理员，2表示普通用户
              create_time: item.date_joined || "--"
            };
          });

          // 处理分页信息
          if (res.count !== undefined) {
            this.total = res.count;
          } else {
            this.total = dataList.length;
          }
        })
        .catch(err => {
          this.loading = false;
          console.error("获取用户列表失败:", err);

          // 显示更详细的错误信息
          let errorMessage;
          if (err.response) {
            console.error("错误状态:", err.response.status);
            console.error("错误数据:", err.response.data);

            errorMessage =
              err.response.data && typeof err.response.data === "object"
                ? JSON.stringify(err.response.data)
                : err.response.data || "获取用户列表失败";
          } else {
            errorMessage = err.message || "获取用户列表失败";
          }

          this.$message.error(errorMessage);
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
        EditUser,
        {
          on: {
            ok: () => {
              this.page = 1;
              this.getList();
            }
          }
        },
        {
          title: "新增用户",
          width: "480px",
          centered: true,
          bodyStyle: {
            maxHeight: "calc(100vh - 200px)",
            overflowY: "auto"
          }
        }
      );
    },
    handleUpdatePwd(record) {
      this.$dialog(
        EditPassword,
        {
          user: Object.assign({}, record),
          on: {
            ok: () => {
              this.getList();
            }
          }
        },
        {
          title: "修改密码",
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
        EditUser,
        {
          user: Object.assign({}, record),
          modifyFlag: true,
          on: {
            ok: () => {
              this.getList();
            }
          }
        },
        {
          title: "编辑用户",
          width: "480px",
          centered: true,
          bodyStyle: {
            maxHeight: "calc(100vh - 200px)",
            overflowY: "auto"
          }
        }
      );
    },
    // 单条删除
    // 在handleDelete函数中修改
    handleDelete(record) {
      const that = this;
      this.$confirm({
        title: "确定删除此用户?",
        content: "删除后数据无法恢复",
        onOk() {
          console.log("删除用户:", record.id);
          deleteApi({
            ids: String(record.id) // 确保转换为字符串
          })
            .then(() => {
              that.$message.success("删除成功");
              that.getList();
            })
            .catch(err => {
              // 错误处理...
            });
        }
      });
    },

    // 批量删除
    handleBatchDelete() {
      if (!this.selectedRowKeys.length) {
        this.$message.warn("请先选择要删除的用户");
        return;
      }

      const that = this;
      this.$confirm({
        title: `确定删除这${this.selectedRowKeys.length}个用户?`,
        content: "删除后数据无法恢复",
        onOk() {
          console.log("批量删除用户:", that.selectedRowKeys.join(","));
          deleteApi({
            ids: that.selectedRowKeys.join(",")
          })
            .then(() => {
              that.$message.success("批量删除成功");
              that.selectedRowKeys = [];
              that.getList();
            })
            .catch(err => {
              console.error("批量删除用户失败:", err);

              // 显示更详细的错误信息
              let errorMessage;
              if (err.response) {
                console.error("错误状态:", err.response.status);
                console.error("错误数据:", err.response.data);

                if (err.response.status === 405) {
                  errorMessage = "此接口不支持删除操作，请检查API配置";
                } else {
                  errorMessage =
                    err.response.data && typeof err.response.data === "object"
                      ? JSON.stringify(err.response.data)
                      : err.response.data;
                }
              } else {
                errorMessage = err.message || "批量删除失败";
              }

              that.$message.error(errorMessage);
            });
        }
      });
    }
  },
  mounted() {
    this.currentAdminUserName = this.$store.state.user.adminUserName;
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
