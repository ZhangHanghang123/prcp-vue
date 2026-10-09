<template>
  <div class="page-wrap">
    <el-card shadow="never" class="header-card">
      <div class="page-title">
        <i class="el-icon-setting" style="color: var(--citic-red)"></i>
        <span>系统管理</span>
        <span class="sub">用户 / 角色 / 字典</span>
      </div>
    </el-card>

    <el-tabs v-model="activeTab" type="border-card" class="mt-16">
      <!-- 用户 Tab -->
      <el-tab-pane label="用户管理" name="user">
        <div class="toolbar">
          <el-input v-model="userKw" placeholder="搜索用户名/姓名" clearable style="width:240px" />
          <el-button icon="el-icon-search" @click="loadUsers">查询</el-button>
          <el-button icon="el-icon-refresh-left" @click="userKw='';loadUsers()">重置</el-button>
          <el-button type="danger" icon="el-icon-plus" @click="openUserDlg()">新增用户</el-button>
        </div>
        <el-table :data="users" border stripe v-loading="loading.user">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="username" label="用户名" width="120" />
          <el-table-column prop="displayName" label="显示名" />
          <el-table-column prop="role" label="角色" width="120">
            <template slot-scope="s">
              <el-tag :type="s.row.role === 'admin' ? 'danger' : 'info'" size="small">{{ s.row.role || 'user' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template slot-scope="s">
              <el-tag :type="s.row.status === 1 ? 'success' : 'warning'" size="small">{{ s.row.status === 1 ? '启用' : '禁用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180" />
          <el-table-column label="操作" width="220" fixed="right">
            <template slot-scope="s">
              <el-button type="text" @click="openUserDlg(s.row)">编辑</el-button>
              <el-button type="text" @click="openPwdDlg(s.row)">重置密码</el-button>
              <el-button type="text" style="color:#C9332B" @click="onDeleteUser(s.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 角色 Tab -->
      <el-tab-pane label="角色管理" name="role">
        <div class="toolbar">
          <el-button type="danger" icon="el-icon-plus" @click="openRoleDlg()">新增角色</el-button>
        </div>
        <el-table :data="roles" border stripe v-loading="loading.role">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="roleCode" label="编码" width="160" />
          <el-table-column prop="roleName" label="名称" />
          <el-table-column prop="description" label="描述" />
          <el-table-column label="状态" width="100">
            <template slot-scope="s">
              <el-tag :type="s.row.status === 1 ? 'success' : 'warning'" size="small">{{ s.row.status === 1 ? '启用' : '禁用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template slot-scope="s">
              <el-button type="text" @click="openRoleDlg(s.row)">编辑</el-button>
              <el-button type="text" style="color:#C9332B" @click="onDeleteRole(s.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 操作日志 Tab -->
      <el-tab-pane label="📋 操作日志" name="audit">
        <div class="toolbar">
          <el-input v-model="auditKw.module" placeholder="模块" clearable style="width:140px" />
          <el-input v-model="auditKw.action" placeholder="动作" clearable style="width:140px" />
          <el-input v-model="auditKw.username" placeholder="用户名" clearable style="width:140px" />
          <el-select v-model="auditKw.status" placeholder="状态" clearable style="width:120px">
            <el-option label="SUCCESS" value="SUCCESS" />
            <el-option label="FAILURE" value="FAILURE" />
          </el-select>
          <el-button icon="el-icon-search" @click="loadAuditLogs">查询</el-button>
          <el-button icon="el-icon-refresh-left" @click="auditKw={};loadAuditLogs()">重置</el-button>
        </div>
        <el-table :data="auditLogs" border stripe v-loading="loading.audit" size="small">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="username" label="用户" width="100" />
          <el-table-column prop="module" label="模块" width="100" />
          <el-table-column prop="action" label="动作" width="120" />
          <el-table-column prop="method" label="方法" width="80" />
          <el-table-column prop="path" label="路径" min-width="200" show-overflow-tooltip />
          <el-table-column prop="durationMs" label="耗时(ms)" width="100" />
          <el-table-column label="状态" width="80">
            <template slot-scope="s">
              <el-tag size="mini" :type="s.row.status==='SUCCESS'?'success':'danger'">{{ s.row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180" />
        </el-table>
        <el-pagination class="pager" :page-size="auditResp.pageSize" :total="auditResp.total"
                        :current-page.sync="auditResp.page" layout="total, prev, pager, next" @current-change="loadAuditLogs" />
      </el-tab-pane>

      <!-- 登录日志 Tab -->
      <el-tab-pane label="🔐 登录日志" name="login">
        <div class="toolbar">
          <el-input v-model="loginKw.username" placeholder="用户名" clearable style="width:140px" />
          <el-select v-model="loginKw.action" placeholder="动作" clearable style="width:140px">
            <el-option label="LOGIN" value="LOGIN" />
            <el-option label="LOGOUT" value="LOGOUT" />
            <el-option label="LOGIN_FAIL" value="LOGIN_FAIL" />
          </el-select>
          <el-select v-model="loginKw.success" placeholder="结果" clearable style="width:120px">
            <el-option label="成功" :value="1" />
            <el-option label="失败" :value="0" />
          </el-select>
          <el-button icon="el-icon-search" @click="loadLoginLogs">查询</el-button>
          <el-button icon="el-icon-refresh-left" @click="loginKw={};loadLoginLogs()">重置</el-button>
        </div>
        <el-table :data="loginLogs" border stripe v-loading="loading.login" size="small">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="username" label="用户名" width="120" />
          <el-table-column label="动作" width="120">
            <template slot-scope="s">
              <el-tag size="mini" :type="s.row.action==='LOGIN'?'success':(s.row.action==='LOGIN_FAIL'?'danger':'info')">{{ s.row.action }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="结果" width="80">
            <template slot-scope="s">
              <el-tag size="mini" :type="(s.row.success===1 || s.row.success===true)?'success':'danger'">{{ (s.row.success===1 || s.row.success===true)?'成功':'失败' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="ipAddress" label="IP" width="140" />
          <el-table-column prop="userAgent" label="UA" min-width="200" show-overflow-tooltip />
          <el-table-column prop="errorMessage" label="错误" min-width="160" show-overflow-tooltip />
          <el-table-column prop="createdAt" label="创建时间" width="180" />
        </el-table>
        <el-pagination class="pager" :page-size="loginResp.pageSize" :total="loginResp.total"
                        :current-page.sync="loginResp.page" layout="total, prev, pager, next" @current-change="loadLoginLogs" />
      </el-tab-pane>

      <!-- 系统监控 Tab -->
      <el-tab-pane label="📊 系统监控" name="stats">
        <div v-loading="loading.stats">
          <el-row :gutter="12">
            <el-col :span="6"><el-card class="kpi-card"><div class="kpi-label">用户总数 / 启用</div><div class="kpi-value">{{ stats.userCount || 0 }} <span class="kpi-sub">/ {{ stats.userActiveCount || 0 }}</span></div></el-card></el-col>
            <el-col :span="6"><el-card class="kpi-card"><div class="kpi-label">角色总数 / 启用</div><div class="kpi-value">{{ stats.roleCount || 0 }} <span class="kpi-sub">/ {{ stats.roleActiveCount || 0 }}</span></div></el-card></el-col>
            <el-col :span="6"><el-card class="kpi-card"><div class="kpi-label">字典总数 / 类型</div><div class="kpi-value">{{ stats.dictCount || 0 }} <span class="kpi-sub">/ {{ stats.dictTypeCount || 0 }}</span></div></el-card></el-col>
            <el-col :span="6"><el-card class="kpi-card"><div class="kpi-label">字典项数</div><div class="kpi-value">{{ stats.dictItemCount || 0 }}</div></el-card></el-col>
          </el-row>
          <el-row :gutter="12" style="margin-top:12px">
            <el-col :span="6"><el-card class="kpi-card"><div class="kpi-label">操作日志总数</div><div class="kpi-value">{{ stats.opLogCount || 0 }}</div></el-card></el-col>
            <el-col :span="6"><el-card class="kpi-card"><div class="kpi-label">24h 操作日志</div><div class="kpi-value">{{ stats.opLogLast24h || 0 }}</div></el-card></el-col>
            <el-col :span="6"><el-card class="kpi-card"><div class="kpi-label">24h 登录成功</div><div class="kpi-value">{{ stats.loginSuccessLast24h || 0 }}</div></el-card></el-col>
            <el-col :span="6"><el-card class="kpi-card"><div class="kpi-label">24h 登录失败</div><div class="kpi-value">{{ stats.loginFailLast24h || 0 }}</div></el-card></el-col>
          </el-row>
          <el-row :gutter="12" style="margin-top:12px">
            <el-col :span="12">
              <el-card>
                <div slot="header" class="chart-h">🏆 Top 5 登录用户</div>
                <el-table :data="stats.topUsers || []" size="mini" border>
                  <el-table-column prop="username" label="用户名" />
                  <el-table-column prop="cnt" label="登录次数" width="120" />
                </el-table>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card>
                <div slot="header" class="chart-h">📈 7 天登录动作分布</div>
                <el-table :data="stats.loginActionsLast7d || []" size="mini" border>
                  <el-table-column prop="action" label="动作" width="120" />
                  <el-table-column prop="cnt" label="次数" width="120" />
                </el-table>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>

      <!-- 字典 Tab（左右栏：左类别 + 右码值） -->
      <el-tab-pane label="字典管理" name="dict">
        <el-alert type="info" :closable="false" show-icon style="margin-bottom:12px">
          <template slot="title">
            PRCP 通用字典 <strong>sys_dict</strong>：所有字典共用一张表，按 dict_type 分类。前端下拉 / Tag 颜色都从此表动态加载。新增字典项后刷新业务页面即生效。
          </template>
        </el-alert>

        <div class="dict-layout">
          <!-- 左：字典类别 -->
          <div class="dict-left">
            <div class="dict-left-head">
              <i class="el-icon-collection"></i>
              <span>字典类别</span>
              <el-button size="mini" type="danger" icon="el-icon-plus" style="margin-left:auto" @click="openDictDlg()">新增字典</el-button>
            </div>
            <el-table
              :data="dictTypes"
              highlight-current-row
              :show-header="false"
              @row-click="onDictTypeClick"
              :row-class-name="dictRowClass"
              v-loading="loading.types"
              class="dict-type-table"
              height="540">
              <el-table-column prop="dictType" label="字典类别" min-width="160">
                <template slot-scope="s">
                  <i class="el-icon-folder" style="color:#C7000B;margin-right:6px"></i>
                  <span style="font-family:Consolas,monospace">{{ s.row.dictType }}</span>
                </template>
              </el-table-column>
              <el-table-column label="项数" width="70" align="right">
                <template slot-scope="s">
                  <el-tag size="mini" effect="plain">{{ s.row.count }}</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 右：字典码值 -->
          <div class="dict-right">
            <div class="dict-right-head">
              <i class="el-icon-notebook-2"></i>
              <span>字典码值：</span>
              <strong v-if="selectedType" style="color:#C7000B">{{ selectedType }}</strong>
              <span v-else style="color:#999">（请选择左侧类别）</span>
              <span style="margin-left:auto">
                <el-input v-if="selectedType" v-model="dictKw" placeholder="搜索 dict_key / dict_label" clearable size="small" style="width:220px" @keyup.enter.native="loadDicts" />
                <el-button v-if="selectedType" size="mini" icon="el-icon-search" @click="loadDicts">查询</el-button>
                <el-button v-if="selectedType" size="mini" icon="el-icon-refresh-left" @click="dictKw='';loadDicts()">重置</el-button>
                <el-button v-if="selectedType" size="mini" type="danger" icon="el-icon-plus" @click="openDictDlg()">新增字典项</el-button>
              </span>
            </div>
            <el-table :data="dicts" border stripe v-loading="loading.dict" height="540">
              <el-table-column prop="dictKey" label="字典值" width="160">
                <template slot-scope="s">
                  <code style="background:#f5f5f5;padding:2px 6px;border-radius:3px">{{ s.row.dictKey }}</code>
                </template>
              </el-table-column>
              <el-table-column prop="dictLabel" label="显示标签" min-width="180">
                <template slot-scope="s">
                  <el-tag v-if="s.row.color" :color="s.row.color" effect="dark" size="small">{{ s.row.dictLabel }}</el-tag>
                  <span v-else>{{ s.row.dictLabel }}</span>
                </template>
              </el-table-column>
              <el-table-column label="颜色" width="100" align="center">
                <template slot-scope="s">
                  <span v-if="s.row.color" class="color-chip" :style="{ background: s.row.color }"></span>
                  <span v-else style="color:#ccc">-</span>
                </template>
              </el-table-column>
              <el-table-column prop="sortOrder" label="排序" width="80" align="center" />
              <el-table-column label="状态" width="100" align="center">
                <template slot-scope="s">
                  <el-tag :type="s.row.status === 'ACTIVE' ? 'success' : 'info'" size="small">{{ s.row.status }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="140" align="center" fixed="right">
                <template slot-scope="s">
                  <el-button type="text" @click="openDictDlg(s.row)">编辑</el-button>
                  <el-button type="text" style="color:#C9332B" @click="onDeleteDict(s.row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 用户编辑对话框 -->
    <el-dialog :title="userDlg.id ? '编辑用户' : '新增用户'" :visible.sync="userDlg.show" width="480px">
      <el-form :model="userDlg" label-width="100px">
        <el-form-item label="用户名"><el-input v-model="userDlg.username" :disabled="!!userDlg.id" /></el-form-item>
        <el-form-item label="初始密码" v-if="!userDlg.id"><el-input v-model="userDlg.password" type="password" /></el-form-item>
        <el-form-item label="显示名"><el-input v-model="userDlg.displayName" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userDlg.role" placeholder="选择角色" style="width:100%">
            <el-option label="管理员 admin" value="admin" />
            <el-option label="普通用户 user" value="user" />
            <el-option label="只读 viewer" value="viewer" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="userDlg.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="userDlg.show=false">取消</el-button>
        <el-button type="primary" @click="onSaveUser">保存</el-button>
      </span>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog title="重置密码" :visible.sync="pwdDlg.show" width="400px">
      <el-form label-width="80px">
        <el-form-item label="用户名"><el-input :value="pwdDlg.username" disabled /></el-form-item>
        <el-form-item label="新密码"><el-input v-model="pwdDlg.password" type="password" /></el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="pwdDlg.show=false">取消</el-button>
        <el-button type="primary" @click="onSavePwd">保存</el-button>
      </span>
    </el-dialog>

    <!-- 角色编辑对话框 -->
    <el-dialog :title="roleDlg.id ? '编辑角色' : '新增角色'" :visible.sync="roleDlg.show" width="480px">
      <el-form :model="roleDlg" label-width="100px">
        <el-form-item label="角色编码"><el-input v-model="roleDlg.roleCode" :disabled="!!roleDlg.id" /></el-form-item>
        <el-form-item label="角色名称"><el-input v-model="roleDlg.roleName" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="roleDlg.description" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="roleDlg.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="roleDlg.show=false">取消</el-button>
        <el-button type="primary" @click="onSaveRole">保存</el-button>
      </span>
    </el-dialog>

    <!-- 字典编辑对话框 -->
    <el-dialog :title="dictDlg.id ? '编辑字典' : '新增字典'" :visible.sync="dictDlg.show" width="480px">
      <el-form :model="dictDlg" label-width="100px">
        <el-form-item label="字典类别"><el-input v-model="dictDlg.dictType" :disabled="!!dictDlg.id" /></el-form-item>
        <el-form-item label="键"><el-input v-model="dictDlg.dictKey" :disabled="!!dictDlg.id" /></el-form-item>
        <el-form-item label="显示标签"><el-input v-model="dictDlg.dictLabel" /></el-form-item>
        <el-form-item label="颜色"><el-input v-model="dictDlg.color" placeholder="例如 #C7000B" /></el-form-item>
        <el-form-item label="顺序"><el-input-number v-model="dictDlg.sortOrder" :min="0" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="dictDlg.status">
            <el-radio label="ACTIVE">启用</el-radio>
            <el-radio label="DEPRECATED">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dictDlg.show=false">取消</el-button>
        <el-button type="primary" @click="onSaveDict">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { adminApi, roleApi, dictApi } from '@/api/sys'

/**
 * @file 系统管理
 * @desc 用户 / 角色 / 字典 / 操作日志 / 登录日志 / 系统监控 6 个 Tab:
 *         1) 用户管理 - admin/user/viewer 三角色, 含密码重置
 *         2) 角色管理 - 角色编码/名称/状态
 *         3) 操作日志 - 分页, 按模块/动作/用户名/状态过滤
 *         4) 登录日志 - 分页, 按用户名/动作(LOGIN/LOGOUT/LOGIN_FAIL)/结果过滤
 *         5) 系统监控 - KPI 卡 (用户/角色/字典数) + Top 5 登录用户 + 7 天登录动作分布
 *         6) 字典管理 - 左右栏: 左类别 (dict_type) 汇总, 右码值列表 (支持新增字典类别 + 新增字典项)
 *
 * @author zhanghh
 * @since 2026-10-09
 *
 * 关联 API:
 *   GET    /sys/user?keyword=                       - 用户列表
 *   POST   /sys/user                                - 新建用户
 *   PUT    /sys/user/{id}                           - 更新用户
 *   DELETE /sys/user/{id}                           - 删除用户
 *   POST   /sys/user/{id}/reset-password            - 重置密码
 *   GET    /sys/role                                - 角色列表
 *   POST   /sys/role                                - 新建角色
 *   PUT    /sys/role/{id}                           - 更新角色
 *   DELETE /sys/role/{id}                           - 删除角色
 *   GET    /sys/dict?keyword=                       - 字典列表 (全量, 按关键字过滤)
 *   GET    /sys/dict/type                           - 字典类别汇总
 *   GET    /sys/dict/type/{type}?keyword=           - 按类别查字典
 *   POST   /sys/dict                                - 新建字典项
 *   PUT    /sys/dict/{id}                           - 更新字典项
 *   DELETE /sys/dict/{id}                           - 删除字典项
 *   GET    /sys/op-log?module=&action=&username=&status=&page=&pageSize= - 操作日志
 *   GET    /sys/login-log?username=&action=&success=&page=&pageSize=    - 登录日志
 *   GET    /sys/stats                               - 系统监控统计
 *
 * 关联组件: 无
 * 关联路由: /sys (group: 系统管理)
 */
export default {
  data() {
    return {
      activeTab: 'user',
      users: [],
      roles: [],
      dicts: [],
      dictTypes: [],     // 左栏：字典类别汇总
      selectedType: '',  // 当前选中的字典类别
      userKw: '',
      dictKw: '',
      // 操作日志
      auditLogs: [],
      auditKw: { module: '', action: '', username: '', status: '' },
      auditResp: { page: 1, pageSize: 20, total: 0 },
      // 登录日志
      loginLogs: [],
      loginKw: { username: '', action: '', success: null },
      loginResp: { page: 1, pageSize: 20, total: 0 },
      // 系统监控
      stats: {},
      loading: { user: false, role: false, dict: false, types: false, audit: false, login: false, stats: false },
      userDlg: { show: false, id: null, username: '', password: '', displayName: '', role: 'user', status: 1 },
      pwdDlg: { show: false, uid: null, username: '', password: '' },
      roleDlg: { show: false, id: null, roleCode: '', roleName: '', description: '', status: 1 },
      dictDlg: { show: false, id: null, dictType: '', dictKey: '', dictLabel: '', color: '', sortOrder: 0, status: 'ACTIVE' }
    }
  },
  mounted() {
    this.loadUsers()
    this.loadRoles()
    this.loadDictTypes()
  },
  watch: {
    activeTab(t) {
      if (t === 'dict' && !this.dictTypes.length) this.loadDictTypes()
      else if (t === 'audit') this.loadAuditLogs()
      else if (t === 'login') this.loadLoginLogs()
      else if (t === 'stats') this.loadStats()
    }
  },
  methods: {
    /** 加载用户列表 (按 userKw 关键字) */
    async loadUsers() {
      this.loading.user = true
      try { this.users = await adminApi.listUsers(this.userKw) } finally { this.loading.user = false }
    },
    /** 加载角色列表 */
    async loadRoles() {
      this.loading.role = true
      try { this.roles = await roleApi.list() } finally { this.loading.role = false }
    },
    /**
     * <p>加载操作日志 (分页, 按 auditKw 过滤)</p>
     *
     * @returns {Promise<void>}
     */
    async loadAuditLogs() {
      this.loading.audit = true
      try {
        const r = await adminApi.listOpLogs({ ...this.auditKw, page: this.auditResp.page, pageSize: this.auditResp.pageSize })
        this.auditLogs = r.items || []
        this.auditResp.total = r.total || 0
      } catch (e) { this.$message.error('加载操作日志失败: ' + (e.message || '')) }
      finally { this.loading.audit = false }
    },
    /**
     * <p>加载登录日志 (分页, 按 loginKw 过滤)</p>
     *
     * @returns {Promise<void>}
     */
    async loadLoginLogs() {
      this.loading.login = true
      try {
        const r = await adminApi.listLoginLogs({ ...this.loginKw, page: this.loginResp.page, pageSize: this.loginResp.pageSize })
        this.loginLogs = r.items || []
        this.loginResp.total = r.total || 0
      } catch (e) { this.$message.error('加载登录日志失败: ' + (e.message || '')) }
      finally { this.loading.login = false }
    },
    /** 加载系统监控统计 (KPI 卡 + Top 用户 + 7 天登录分布) */
    async loadStats() {
      this.loading.stats = true
      try { this.stats = await adminApi.stats() } catch (e) { this.$message.error('加载统计失败: ' + (e.message || '')) }
      finally { this.loading.stats = false }
    },
    /**
     * <p>加载字典类别汇总, 默认选第一个类别</p>
     *
     * @returns {Promise<void>}
     */
    async loadDictTypes() {
      this.loading.types = true
      try {
        this.dictTypes = await dictApi.listTypesSummary()
        if (this.dictTypes.length && !this.selectedType) {
          this.selectedType = this.dictTypes[0].dictType
          await this.loadDicts()
        }
      } finally { this.loading.types = false }
    },
    /**
     * <p>加载当前类别 + 关键字下的字典码值列表</p>
     *
     * @returns {Promise<void>}
     */
    async loadDicts() {
      this.loading.dict = true
      try {
        const kw = (this.dictKw || '').trim()
        if (this.selectedType) {
          this.dicts = await dictApi.listByType(this.selectedType, kw)
        } else {
          this.dicts = await dictApi.list(kw)
        }
      } finally { this.loading.dict = false }
    },
    /**
     * <p>左栏点击字典类别 → 切换 selectedType + 加载码值</p>
     *
     * @param {Object} row 字典类别行 (含 dictType)
     * @returns {void}
     */
    onDictTypeClick(row) {
      this.selectedType = row.dictType
      this.dictKw = ''
      this.loadDicts()
    },
    /**
     * <p>字典类别行 class (当前选中高亮)</p>
     *
     * @param {Object} param 行对象 (含 row)
     * @returns {string} class 名
     */
    dictRowClass({ row }) {
      return row.dictType === this.selectedType ? 'current-row' : ''
    },

    /**
     * <p>打开用户新增/编辑弹窗 (row 不传则新建)</p>
     *
     * @param {Object} [row] 用户行, 不传则新建
     * @returns {void}
     */
    openUserDlg(row) {
      if (row) {
        this.userDlg = { show: true, id: row.id, username: row.username, password: '', displayName: row.displayName, role: row.role || 'user', status: row.status }
      } else {
        this.userDlg = { show: true, id: null, username: '', password: '', displayName: '', role: 'user', status: 1 }
      }
    },
    /**
     * <p>提交用户弹窗 (新增含密码, 更新不含密码)</p>
     *
     * @returns {Promise<void>}
     */
    async onSaveUser() {
      try {
        if (this.userDlg.id) {
          await adminApi.updateUser(this.userDlg.id, { display_name: this.userDlg.displayName, role: this.userDlg.role, status: this.userDlg.status })
        } else {
          await adminApi.createUser({ username: this.userDlg.username, password: this.userDlg.password, display_name: this.userDlg.displayName, role: this.userDlg.role })
        }
        this.$message.success('保存成功')
        this.userDlg.show = false
        this.loadUsers()
      } catch (e) { this.$message.error(e.message || '保存失败') }
    },
    /**
     * <p>删除用户 (带 confirm)</p>
     *
     * @param {Object} row 用户行
     * @returns {Promise<void>}
     */
    async onDeleteUser(row) {
      try { await this.$confirm(`确定删除用户 ${row.username} ？`, '确认'); await adminApi.deleteUser(row.id); this.$message.success('已删除'); await loadUsers() }
      catch (e) { if (e !== 'cancel') this.$message.error(e.message || '删除失败') }
    },
    /**
     * <p>打开重置密码弹窗</p>
     *
     * @param {Object} row 用户行
     * @returns {void}
     */
    openPwdDlg(row) {
      this.pwdDlg = { show: true, uid: row.id, username: row.username, password: '' }
    },
    /** 提交重置密码 */
    async onSavePwd() {
      try { await adminApi.resetPassword(this.pwdDlg.uid, this.pwdDlg.password); this.$message.success('密码已重置'); this.pwdDlg.show = false }
      catch (e) { this.$message.error(e.message || '重置失败') }
    },

    /**
     * <p>打开角色新增/编辑弹窗</p>
     *
     * @param {Object} [row] 角色行, 不传则新建
     * @returns {void}
     */
    openRoleDlg(row) {
      if (row) {
        this.roleDlg = { show: true, id: row.id, roleCode: row.roleCode, roleName: row.roleName, description: row.description, status: row.status }
      } else {
        this.roleDlg = { show: true, id: null, roleCode: '', roleName: '', description: '', status: 1 }
      }
    },
    /** 提交角色弹窗 (新增或更新) */
    async onSaveRole() {
      try {
        if (this.roleDlg.id) {
          await roleApi.update(this.roleDlg.id, { role_name: this.roleDlg.roleName, description: this.roleDlg.description, status: this.roleDlg.status })
        } else {
          await roleApi.create({ role_code: this.roleDlg.roleCode, role_name: this.roleDlg.roleName, description: this.roleDlg.description })
        }
        this.$message.success('保存成功'); this.roleDlg.show = false; this.loadRoles()
      } catch (e) { this.$message.error(e.message || '保存失败') }
    },
    /**
     * <p>删除角色 (带 confirm)</p>
     *
     * @param {Object} row 角色行
     * @returns {Promise<void>}
     */
    async onDeleteRole(row) {
      try { await this.$confirm(`确定删除角色 ${row.roleName}？`, '确认'); await roleApi.remove(row.id); this.$message.success('已删除'); await this.loadRoles() }
      catch (e) { if (e !== 'cancel') this.$message.error(e.message || '删除失败') }
    },

    /**
     * <p>打开字典项新增/编辑弹窗 (新增时默认带当前选中的 dict_type)</p>
     *
     * @param {Object} [row] 字典项行, 不传则新建
     * @returns {void}
     */
    openDictDlg(row) {
      if (row) {
        this.dictDlg = { show: true, id: row.id, dictType: row.dictType, dictKey: row.dictKey, dictLabel: row.dictLabel, color: row.color, sortOrder: row.sortOrder, status: row.status }
      } else {
        // 新增时默认带当前选中的 dict_type，便于连续新增同一类别
        this.dictDlg = { show: true, id: null, dictType: this.selectedType || '', dictKey: '', dictLabel: '', color: '', sortOrder: 0, status: 'ACTIVE' }
      }
    },
    /**
     * <p>提交字典项 (新增或更新), 同时刷新码值列表和类别汇总</p>
     *
     * @returns {Promise<void>}
     */
    async onSaveDict() {
      try {
        if (this.dictDlg.id) {
          await dictApi.update(this.dictDlg.id, { dict_label: this.dictDlg.dictLabel, color: this.dictDlg.color, sort_order: this.dictDlg.sortOrder, status: this.dictDlg.status })
        } else {
          await dictApi.create({ dict_type: this.dictDlg.dictType, dict_key: this.dictDlg.dictKey, dict_label: this.dictDlg.dictLabel, color: this.dictDlg.color, sort_order: this.dictDlg.sortOrder })
        }
        this.$message.success('保存成功'); this.dictDlg.show = false; this.loadDicts(); this.loadDictTypes()
      } catch (e) { this.$message.error(e.message || '保存失败') }
    },
    /**
     * <p>删除字典项 (带 confirm), 刷新码值列表 + 类别汇总</p>
     *
     * @param {Object} row 字典项行
     * @returns {Promise<void>}
     */
    async onDeleteDict(row) {
      try { await this.$confirm(`确定删除字典 ${row.dictType}:${row.dictKey}？`, '确认'); await dictApi.remove(row.id); this.$message.success('已删除'); await this.loadDicts(); await this.loadDictTypes() }
      catch (e) { if (e !== 'cancel') this.$message.error(e.message || '删除失败') }
    }
  }
}
</script>

<style scoped>
.page-wrap { padding: 16px; }
.header-card { border-top: 3px solid var(--citic-red); }
.page-title { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 600; }
.page-title .sub { font-size: 12px; color: #999; font-weight: normal; margin-left: 8px; }
.mt-16 { margin-top: 16px; }
.toolbar { margin-bottom: 12px; display: flex; gap: 8px; }

/* 字典左右栏布局 */
.dict-layout { display: flex; gap: 12px; align-items: stretch; }
.dict-left { width: 320px; background: #fff; border: 1px solid #ebeef5; border-radius: 4px; }
.dict-right { flex: 1; background: #fff; border: 1px solid #ebeef5; border-radius: 4px; padding-bottom: 6px; }
.dict-left-head, .dict-right-head {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; background: #fafbfc;
  border-bottom: 1px solid #ebeef5; font-size: 14px;
}
.dict-left-head i, .dict-right-head i { color: #0B6FF2; }
.dict-type-table >>> .current-row td { background-color: #F0F7FF !important; color: #0B6FF2; font-weight: 600; }
.color-chip { display:inline-block; width:24px; height:24px; border-radius:4px; vertical-align: middle; box-shadow: 0 0 0 1px rgba(0,0,0,.08); }
.pager { text-align: right; margin-top: 12px; }
.kpi-card { padding: 12px 16px; }
.kpi-card .kpi-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.kpi-card .kpi-value { font-size: 22px; font-weight: 600; color: #303133; }
.kpi-card .kpi-value .kpi-sub { font-size: 14px; color: #909399; font-weight: normal; }
.chart-h { font-size: 14px; font-weight: 600; }
</style>