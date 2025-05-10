<template>
  <div class="admin-users">
    <a-card title="用户管理" :bordered="false">
      <!-- 搜索表单 -->
      <div class="table-page-search-wrapper">
        <a-form layout="inline">
          <a-row :gutter="48">
            <a-col :md="8" :sm="24">
              <a-form-item label="用户名">
                <a-input v-model="queryParam.username" placeholder="请输入" allowClear />
              </a-form-item>
            </a-col>
            <a-col :md="8" :sm="24">
              <a-form-item label="邮箱">
                <a-input v-model="queryParam.email" placeholder="请输入" allowClear />
              </a-form-item>
            </a-col>
            <a-col :md="8" :sm="24">
              <a-form-item label="状态">
                <a-select v-model="queryParam.is_active" placeholder="请选择" allowClear>
                  <a-select-option :value="true">已激活</a-select-option>
                  <a-select-option :value="false">未激活</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="48">
            <a-col :md="8" :sm="24">
              <a-form-item label="员工">
                <a-select v-model="queryParam.is_staff" placeholder="请选择" allowClear>
                  <a-select-option :value="true">是</a-select-option>
                  <a-select-option :value="false">否</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :md="16" :sm="24">
              <span class="table-page-search-submitButtons">
                <a-button type="primary" @click="$refs.table.refresh(true)">查询</a-button>
                <a-button style="margin-left: 8px" @click="resetSearch">重置</a-button>
                <a-button type="primary" style="margin-left: 8px" @click="handleAdd">新增用户</a-button>
              </span>
            </a-col>
          </a-row>
        </a-form>
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
        <span slot="is_staff" slot-scope="text">
          <a-badge :status="text ? 'success' : 'default'" :text="text ? '是' : '否'" />
        </span>
        <span slot="is_superuser" slot-scope="text">
          <a-badge :status="text ? 'success' : 'default'" :text="text ? '是' : '否'" />
        </span>
        <span slot="is_active" slot-scope="text">
          <a-badge :status="text ? 'success' : 'default'" :text="text ? '已激活' : '未激活'" />
        </span>
        <span slot="date_joined" slot-scope="text">
          {{ text ? new Date(text).toLocaleString() : '' }}
        </span>
        <span slot="action" slot-scope="text, record">
          <a @click="handleDetail(record)">详情</a>
          <a-divider type="vertical" />
          <a @click="handleEdit(record)">编辑</a>
          <a-divider type="vertical" />
          <a-dropdown>
            <a class="ant-dropdown-link">
              更多 <a-icon type="down" />
            </a>
            <a-menu slot="overlay">
              <a-menu-item v-if="!record.is_active">
                <a @click="handleUpdateStatus(record, true)">激活</a>
              </a-menu-item>
              <a-menu-item v-if="record.is_active">
                <a @click="handleUpdateStatus(record, false)">禁用</a>
              </a-menu-item>
              <a-menu-item v-if="!record.is_superuser && !isCurrentUser(record)">
                <a @click="handleDelete(record)">删除</a>
              </a-menu-item>
            </a-menu>
          </a-dropdown>
        </span>
      </s-table>
    </a-card>

    <!-- 用户详情抽屉 -->
    <a-drawer
      title="用户详情"
      :width="720"
      :visible="detailVisible"
      :body-style="{ paddingBottom: '80px' }"
      @close="detailVisible = false"
    >
      <a-spin :spinning="detailLoading">
        <a-descriptions :column="2" bordered v-if="detailData">
          <a-descriptions-item label="用户ID">{{ detailData.id }}</a-descriptions-item>
          <a-descriptions-item label="用户名">{{ detailData.username }}</a-descriptions-item>
          <a-descriptions-item label="邮箱">{{ detailData.email }}</a-descriptions-item>
          <a-descriptions-item label="姓名">{{ detailData.first_name }} {{ detailData.last_name }}</a-descriptions-item>
          <a-descriptions-item label="是否员工">
            <a-badge :status="detailData.is_staff ? 'success' : 'default'" :text="detailData.is_staff ? '是' : '否'" />
          </a-descriptions-item>
          <a-descriptions-item label="是否超级管理员">
            <a-badge :status="detailData.is_superuser ? 'success' : 'default'" :text="detailData.is_superuser ? '是' : '否'" />
          </a-descriptions-item>
          <a-descriptions-item label="是否激活">
            <a-badge :status="detailData.is_active ? 'success' : 'default'" :text="detailData.is_active ? '已激活' : '未激活'" />
          </a-descriptions-item>
          <a-descriptions-item label="订单数量">{{ detailData.order_count }}</a-descriptions-item>
          <a-descriptions-item label="注册时间">{{ detailData.date_joined ? new Date(detailData.date_joined).toLocaleString() : '-' }}</a-descriptions-item>
          <a-descriptions-item label="最后登录">{{ detailData.last_login ? new Date(detailData.last_login).toLocaleString() : '-' }}</a-descriptions-item>
        </a-descriptions>

        <a-divider />

        <h3>最近订单</h3>
        <a-table
          :columns="orderColumns"
          :data-source="detailData ? detailData.recent_orders : []"
          rowKey="id"
          :pagination="false"
        >
          <span slot="status" slot-scope="text">
            <a-tag :color="statusColor(text)">{{ statusText(text) }}</a-tag>
          </span>
          <span slot="total_amount" slot-scope="text">
            ¥{{ parseFloat(text).toFixed(2) }}
          </span>
          <span slot="created_at" slot-scope="text">
            {{ text ? new Date(text).toLocaleString() : '' }}
          </span>
        </a-table>

        <a-divider />

        <h3>登录日志</h3>
        <a-table
          :columns="logColumns"
          :data-source="detailData ? detailData.login_logs : []"
          rowKey="id"
          :pagination="false"
        >
          <span slot="timestamp" slot-scope="text">
            {{ text ? new Date(text).toLocaleString() : '' }}
          </span>
        </a-table>

        <div class="drawer-footer">
          <a-button :style="{ marginRight: '8px' }" @click="detailVisible = false">关闭</a-button>
          <a-button type="primary" @click="handleEdit(detailData)">编辑</a-button>
        </div>
      </a-spin>
    </a-drawer>

    <!-- 新增/编辑用户表单 -->
    <a-modal
      :title="modalTitle"
      :visible="modalVisible"
      :confirmLoading="modalLoading"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
    >
      <a-form :form="form">
        <a-form-item label="用户名" :labelCol="{ span: 6 }" :wrapperCol="{ span: 14 }">
          <a-input
            v-decorator="[
              'username',
              {
                rules: [{ required: true, message: '请输入用户名' }]
              }
            ]"
            placeholder="请输入用户名"
          />
        </a-form-item>
        <a-form-item label="邮箱" :labelCol="{ span: 6 }" :wrapperCol="{ span: 14 }">
          <a-input
            v-decorator="[
              'email',
              {
                rules: [
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱' }
                ]
              }
            ]"
            placeholder="请输入邮箱"
          />
        </a-form-item>
        <a-form-item label="密码" :labelCol="{ span: 6 }" :wrapperCol="{ span: 14 }">
          <a-input-password
            v-decorator="[
              'password',
              {
                rules: [{ required: !currentRecord, message: '请输入密码' }]
              }
            ]"
            placeholder="请输入密码"
          />
          <span v-if="currentRecord" class="ant-form-text">留空表示不修改密码</span>
        </a-form-item>
        <a-form-item label="名" :labelCol="{ span: 6 }" :wrapperCol="{ span: 14 }">
          <a-input
            v-decorator="['first_name']"
            placeholder="请输入名"
          />
        </a-form-item>
        <a-form-item label="姓" :labelCol="{ span: 6 }" :wrapperCol="{ span: 14 }">
          <a-input
            v-decorator="['last_name']"
            placeholder="请输入姓"
          />
        </a-form-item>
        <a-form-item label="是否员工" :labelCol="{ span: 6 }" :wrapperCol="{ span: 14 }">
          <a-switch
            v-decorator="[
              'is_staff',
              {
                valuePropName: 'checked'
              }
            ]"
          />
        </a-form-item>
        <a-form-item label="是否超级管理员" :labelCol="{ span: 6 }" :wrapperCol="{ span: 14 }">
          <a-switch
            v-decorator="[
              'is_superuser',
              {
                valuePropName: 'checked'
              }
            ]"
          />
        </a-form-item>
        <a-form-item label="是否激活" :labelCol="{ span: 6 }" :wrapperCol="{ span: 14 }">
          <a-switch
            v-decorator="[
              'is_active',
              {
                valuePropName: 'checked'
              }
            ]"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { STable } from '@/components';
import { users } from '@/api/admin';

export default {
  name: 'AdminUsers',
  components: {
    STable
  },
  data() {
    return {
      // 查询参数
      queryParam: {
        username: undefined,
        email: undefined,
        is_staff: undefined,
        is_active: undefined
      },
      // 表格列定义
      columns: [
        {
          title: 'ID',
          dataIndex: 'id'
        },
        {
          title: '用户名',
          dataIndex: 'username'
        },
        {
          title: '邮箱',
          dataIndex: 'email'
        },
        {
          title: '是否员工',
          dataIndex: 'is_staff',
          scopedSlots: { customRender: 'is_staff' }
        },
        {
          title: '是否超级管理员',
          dataIndex: 'is_superuser',
          scopedSlots: { customRender: 'is_superuser' }
        },
        {
          title: '状态',
          dataIndex: 'is_active',
          scopedSlots: { customRender: 'is_active' }
        },
        {
          title: '注册时间',
          dataIndex: 'date_joined',
          scopedSlots: { customRender: 'date_joined' }
        },
        {
          title: '操作',
          dataIndex: 'action',
          width: '150px',
          scopedSlots: { customRender: 'action' }
        }
      ],
      // 订单列定义
      orderColumns: [
        {
          title: '订单ID',
          dataIndex: 'id'
        },
        {
          title: '订单金额',
          dataIndex: 'total_amount',
          scopedSlots: { customRender: 'total_amount' }
        },
        {
          title: '订单状态',
          dataIndex: 'status',
          scopedSlots: { customRender: 'status' }
        },
        {
          title: '创建时间',
          dataIndex: 'created_at',
          scopedSlots: { customRender: 'created_at' }
        }
      ],
      // 日志列定义
      logColumns: [
        {
          title: 'ID',
          dataIndex: 'id'
        },
        {
          title: '操作',
          dataIndex: 'action'
        },
        {
          title: 'IP地址',
          dataIndex: 'ip_address'
        },
        {
          title: '时间',
          dataIndex: 'timestamp',
          scopedSlots: { customRender: 'timestamp' }
        },
        {
          title: '用户代理',
          dataIndex: 'user_agent'
        }
      ],
      // 详情抽屉
      detailVisible: false,
      detailLoading: false,
      detailData: null,
      // 表单
      form: this.$form.createForm(this),
      // 模态框
      modalVisible: false,
      modalLoading: false,
      modalTitle: '新增用户',
      currentRecord: null
    };
  },
  methods: {
    // 加载表格数据
    loadData(parameter) {
      const requestParameters = Object.assign({}, parameter, this.queryParam);
      return users.getUsers(requestParameters).then(res => {
        return {
          pageSize: res.limit,
          pageNo: res.page,
          totalCount: res.total,
          totalPage: res.pages,
          data: res.items
        };
      });
    },
    // 重置搜索
    resetSearch() {
      this.queryParam = {
        username: undefined,
        email: undefined,
        is_staff: undefined,
        is_active: undefined
      };
      this.$refs.table.refresh(true);
    },
    // 查看详情
    handleDetail(record) {
      this.detailVisible = true;
      this.detailLoading = true;
      users.getUserDetail(record.id).then(res => {
        this.detailData = res;
        this.detailLoading = false;
      }).catch(() => {
        this.detailLoading = false;
      });
    },
    // 新增用户
    handleAdd() {
      this.modalTitle = '新增用户';
      this.currentRecord = null;
      this.form.resetFields();
      this.$nextTick(() => {
        this.form.setFieldsValue({
          is_active: true
        });
      });
      this.modalVisible = true;
    },
    // 编辑用户
    handleEdit(record) {
      this.modalTitle = '编辑用户';
      this.currentRecord = record;
      this.form.resetFields();
      this.$nextTick(() => {
        this.form.setFieldsValue({
          username: record.username,
          email: record.email,
          first_name: record.first_name,
          last_name: record.last_name,
          is_staff: record.is_staff,
          is_superuser: record.is_superuser,
          is_active: record.is_active
        });
      });
      this.modalVisible = true;
    },
    // 更新用户状态
    handleUpdateStatus(record, isActive) {
      this.$confirm({
        title: `确认${isActive ? '激活' : '禁用'}此用户?`,
        content: '此操作将改变用户的登录权限',
        onOk: () => {
          users.updateUser(record.id, { is_active: isActive }).then(() => {
            this.$message.success(`用户${isActive ? '激活' : '禁用'}成功`);
            this.$refs.table.refresh();
            if (this.detailVisible && this.detailData && this.detailData.id === record.id) {
              this.handleDetail(record);
            }
          });
        }
      });
    },
    // 删除用户
    handleDelete(record) {
      this.$confirm({
        title: '确认删除此用户?',
        content: '此操作不可逆，请谨慎操作',
        onOk: () => {
          users.deleteUser(record.id).then(() => {
            this.$message.success('用户删除成功');
            this.$refs.table.refresh();
            if (this.detailVisible && this.detailData && this.detailData.id === record.id) {
              this.detailVisible = false;
            }
          }).catch(err => {
            this.$message.error(err.response?.data?.message || '删除失败');
          });
        }
      });
    },
    // 模态框确认
    handleModalOk() {
      this.form.validateFields((err, values) => {
        if (err) return;
        
        this.modalLoading = true;
        
        if (this.currentRecord) {
          // 更新用户
          users.updateUser(this.currentRecord.id, values).then(() => {
            this.$message.success('更新成功');
            this.modalVisible = false;
            this.$refs.table.refresh();
          }).catch(err => {
            this.$message.error(err.response?.data?.message || '更新失败');
          }).finally(() => {
            this.modalLoading = false;
          });
        } else {
          // 新增用户
          users.createUser(values).then(() => {
            this.$message.success('新增成功');
            this.modalVisible = false;
            this.$refs.table.refresh();
          }).catch(err => {
            this.$message.error(err.response?.data?.message || '新增失败');
          }).finally(() => {
            this.modalLoading = false;
          });
        }
      });
    },
    // 模态框取消
    handleModalCancel() {
      this.modalVisible = false;
    },
    // 订单状态文本
    statusText(status) {
      const statusMap = {
        'pending': '待支付',
        'paid': '已支付',
        'shipped': '已发货',
        'delivered': '已送达',
        'cancelled': '已取消'
      };
      return statusMap[status] || status;
    },
    // 订单状态颜色
    statusColor(status) {
      const colorMap = {
        'pending': 'orange',
        'paid': 'green',
        'shipped': 'blue',
        'delivered': 'purple',
        'cancelled': 'red'
      };
      return colorMap[status] || 'default';
    },
    // 是否是当前用户
    isCurrentUser(record) {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      return currentUser.id === record.id;
    }
  }
};
</script>

<style lang="less" scoped>
.admin-users {
  .table-page-search-wrapper {
    margin-bottom: 16px;
  }
  
  .drawer-footer {
    position: absolute;
    bottom: 0;
    width: 100%;
    border-top: 1px solid #e8e8e8;
    padding: 10px 16px;
    text-align: right;
    left: 0;
    background: #fff;
  }
}
</style>
