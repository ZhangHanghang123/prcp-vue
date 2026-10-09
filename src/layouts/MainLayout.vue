<template>
  <el-container class="main-layout">
    <!-- 顶部 -->
    <el-header class="header">
      <div class="header-left">
        <i class="el-icon-bank header-icon"></i>
        <span class="header-title">PRCP · 银行资产负债管理平台</span>
        <el-tag class="header-badge" effect="plain" size="small">Java 版</el-tag>
      </div>
      <div class="header-right">
        <el-dropdown @command="onCommand">
          <span class="user-info">
            <i class="el-icon-user-solid"></i>
            {{ user ? user.real_name || user.username : '未登录' }}
            <i class="el-icon-arrow-down"></i>
          </span>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </el-header>

    <el-container>
      <!-- 侧边栏：二级菜单 -->
      <el-aside width="220px" class="aside">
        <el-menu
          :default-active="$route.path"
          :default-openeds="openedGroups"
          router
          class="aside-menu"
        >
          <template v-for="group in menuGroups">
            <!-- 单项（无子菜单） -->
            <el-menu-item
              v-if="group.children.length === 1"
              :key="group.title"
              :index="group.children[0].path"
            >
              <i :class="group.children[0].icon"></i>
              <span slot="title">{{ group.children[0].title }}</span>
            </el-menu-item>

            <!-- 有子菜单：el-submenu -->
            <el-submenu
              v-else
              :key="group.title"
              :index="group.title"
            >
              <template slot="title">
                <i :class="group.icon"></i>
                <span>{{ group.title }}</span>
              </template>
              <el-menu-item
                v-for="item in group.children"
                :key="item.path"
                :index="item.path"
              >
                <i :class="item.icon"></i>
                <span slot="title">{{ item.title }}</span>
              </el-menu-item>
            </el-submenu>
          </template>
        </el-menu>
      </el-aside>

      <!-- 主内容 -->
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
import { mapGetters } from 'vuex'

/**
 * @file 全局主布局 (侧边栏 + 顶部导航 + 路由切换)
 * @desc PRCP-Java 平台的全局布局。结构:
 *         1) 顶部 Header: 左 Logo + 标题 + 徽章 (Java 版); 右 用户下拉 (退出登录)
 *         2) 侧边栏 Aside: 8 大菜单分组 (按业务流程), 单项直接渲染 el-menu-item, 多项用 el-submenu
 *         3) 主内容 Main: <router-view/> 路由切换
 *       菜单分组:
 *         - 工作台: 结果驾驶舱 (直链 reverse?tab=result)
 *         - 基础数据: 账户册维护、基础数据维护
 *         - 市场与情景: 利率曲线管理、ESG 经济情景生成
 *         - 指标定义: 报表表项管理、指标管理、指标计量系数
 *         - 引擎建模: 模型管理、新业务模拟方案
 *         - 计量参数补录: CET1/LCR/NIM/NSFR/ROE/EVE 参数补录
 *         - 反算分析: 测算方案、反算 Dashboard、反算指标结果表、反算结果查询、资产负债表
 *         - 系统管理: 用户·角色·字典·审计
 *
 * @author zhanghh
 * @since 2026-10-09
 *
 * 关联组件: 无
 * 关联路由: 全局 layout (匹配所有非 /login 路径)
 */
export default {
  name: 'MainLayout',
  computed: {
    ...mapGetters('user', ['user']),
    // 按业务流程分组的菜单（数据准备 → 市场输入 → 指标定义 → 引擎建模 → 反算分析 → 系统管理）
    menuGroups() {
      return [
        {
          title: '工作台',
          icon: 'el-icon-s-home',
          children: [
            { path: '/reverse?tab=result', title: '结果驾驶舱', icon: 'el-icon-data-board' }
          ]
        },
        {
          title: '基础数据',
          icon: 'el-icon-folder',
          children: [
            { path: '/coa',           title: '账户册维护',     icon: 'el-icon-share' },
            { path: '/basic-data',    title: '基础数据维护',   icon: 'el-icon-data-analysis' }
          ]
        },
        {
          title: '市场与情景',
          icon: 'el-icon-pie-chart',
          children: [
            { path: '/rate', title: '利率曲线管理',     icon: 'el-icon-data-line' },
            { path: '/esg',  title: 'ESG 经济情景生成', icon: 'el-icon-lightning' }
          ]
        },
        {
          title: '指标定义',
          icon: 'el-icon-data-line',
          children: [
            { path: '/reports',            title: '报表表项管理',   icon: 'el-icon-document' },
            { path: '/kpi',                title: '指标管理',       icon: 'el-icon-data-line' },
            { path: '/metric-coefficient', title: '指标计量系数',   icon: 'el-icon-tickets' }
          ]
        },
        {
          title: '引擎建模',
          icon: 'el-icon-cpu',
          children: [
            { path: '/model', title: '模型管理',       icon: 'el-icon-cpu' },
            { path: '/sim',   title: '新业务模拟方案', icon: 'el-icon-magic-stick' }
          ]
        },
        {
          title: '计量参数补录',
          icon: 'el-icon-set-up',
          children: [
            { path: '/cet1-param', title: 'CET1 参数补录', icon: 'el-icon-money' },
            { path: '/lcr-param',  title: 'LCR 参数补录',  icon: 'el-icon-tickets' },
            { path: '/nim-param',  title: 'NIM 参数补录',  icon: 'el-icon-data-line' },
            { path: '/nsfr-param', title: 'NSFR 参数补录', icon: 'el-icon-collection' },
            { path: '/roe-param',  title: 'ROE 参数补录',  icon: 'el-icon-medal' },
            { path: '/eve-param',  title: 'EVE 参数补录',  icon: 'el-icon-coin' }
          ]
        },
        {
          title: '反算分析',
          icon: 'el-icon-data-analysis',
          children: [
            { path: '/reverse',               title: '测算方案',       icon: 'el-icon-position' },
            { path: '/reverse-dashboard',     title: '反算 Dashboard', icon: 'el-icon-data-analysis' },
            { path: '/reverse-metric-table',  title: '反算指标结果表', icon: 'el-icon-tickets' },
            { path: '/reverse-result',        title: '反算结果查询',   icon: 'el-icon-search' },
            { path: '/balance',               title: '资产负债表',     icon: 'el-icon-money' }
          ]
        },
        {
          title: '系统管理',
          icon: 'el-icon-setting',
          children: [
            { path: '/sys', title: '用户·角色·字典·审计', icon: 'el-icon-setting' }
          ]
        }
      ]
    },
    // 默认展开所有分组（可根据用户喜好改成记忆展开）
    openedGroups() {
      return this.menuGroups.map(g => g.title)
    }
  },
  methods: {
    /**
     * <p>顶部用户下拉菜单命令处理 (logout → 退出登录)</p>
     *
     * @param {string} cmd 命令 key (目前仅 'logout')
     * @returns {void}
     */
    onCommand(cmd) {
      if (cmd === 'logout') {
        this.$confirm('确认退出？', '提示', { type: 'warning' })
          .then(() => {
            this.$store.dispatch('user/logout')
            this.$router.push('/login')
          })
          .catch(() => {})
      }
    }
  }
}
</script>

<style scoped>
.main-layout { height: 100vh; }
.header {
  background: #fff;
  border-bottom: 1px solid var(--border-color-2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 56px;
}
.header-left { display: flex; align-items: center; gap: 10px; }
.header-icon {
  font-size: 22px;
  color: var(--brand-primary);
}
.header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-title);
  letter-spacing: 0.2px;
}
.header-badge {
  background: var(--brand-primary-pale) !important;
  color: var(--brand-primary) !important;
  border: 1px solid var(--brand-primary-light) !important;
  font-weight: 500;
}
.user-info {
  cursor: pointer;
  color: var(--text-body);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.user-info:hover { color: var(--brand-primary); }

.aside {
  background: #fff;
  border-right: 1px solid var(--border-color-2);
}
.el-menu { border-right: 0; }
.el-main { padding: 0; background: var(--bg-page); overflow: auto; }

/* 一级菜单（子菜单标题）样式 */
.aside-menu >>> .el-submenu__title {
  font-weight: 600;
  color: var(--text-title);
  font-size: 14px;
}
.aside-menu >>> .el-submenu .el-menu-item {
  font-size: 13px;
  padding-left: 48px !important;
  min-width: 0;
  color: var(--text-body);
}
/* 选中态高亮：克制蓝 */
.aside-menu >>> .el-menu-item.is-active {
  color: var(--brand-primary) !important;
  border-right: 3px solid var(--brand-primary);
  background: var(--brand-primary-pale) !important;
  font-weight: 600;
}
.aside-menu >>> .el-menu-item:hover { color: var(--brand-primary-hover) !important; }
.aside-menu >>> .el-submenu__title:hover { color: var(--brand-primary) !important; }
</style>