import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/Index.vue'),
    meta: { title: '登录', public: true }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/coa',
    children: [
      // ===== 一级：工作台（驾驶舱内容已合并进 reverse/测算结果页签） =====
      // 原 /dashboard 路由已移除；驾驶舱组件以 reverse/components/DashboardPanels.vue 形式承载
      // 入口在测算方案 → 测算结果 页签下
      // 兼容旧 /dashboard URL：重定向到 /coa（避免空白页）
      {
        path: 'dashboard',
        redirect: '/coa'
      },

      // ===== 一级：基础数据 =====
      {
        path: 'coa',
        name: 'Coa',
        component: () => import('@/views/coa/Index.vue'),
        meta: { title: '账户册维护', icon: 'el-icon-share', group: '基础数据' }
      },
      {
        path: 'basic-data',
        name: 'BasicData',
        component: () => import('@/views/basic-data/Index.vue'),
        meta: { title: '基础数据维护', icon: 'el-icon-data-analysis', group: '基础数据' }
      },

      // ===== 一级：指标定义 =====
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/reports/Index.vue'),
        meta: { title: '报表表项管理', icon: 'el-icon-document', group: '指标定义' }
      },
      {
        path: 'kpi',
        name: 'Kpi',
        component: () => import('@/views/kpi/Index.vue'),
        meta: { title: '指标管理', icon: 'el-icon-data-line', group: '指标定义' }
      },
      {
        path: 'metric-coefficient',
        name: 'MetricCoefficient',
        component: () => import('@/views/metric-coefficient/index.vue'),
        meta: { title: '指标计量系数', icon: 'el-icon-tickets', group: '指标定义' }
      },

      // ===== 一级：市场与情景 =====
      {
        path: 'rate',
        name: 'Rate',
        component: () => import('@/views/rate/Index.vue'),
        meta: { title: '利率曲线管理', icon: 'el-icon-data-line', group: '市场与情景' }
      },
      {
        path: 'esg',
        name: 'Esg',
        component: () => import('@/views/esg/Index.vue'),
        meta: { title: 'ESG 经济情景生成', icon: 'el-icon-lightning', group: '市场与情景' }
      },

      // ===== 一级：引擎建模 =====
      {
        path: 'sim',
        name: 'Sim',
        component: () => import('@/views/sim/Index.vue'),
        meta: { title: '新业务模拟方案', icon: 'el-icon-magic-stick', group: '引擎建模' }
      },
      {
        path: 'model',
        name: 'Model',
        component: () => import('@/views/model/Index.vue'),
        meta: { title: '模型管理', icon: 'el-icon-cpu', group: '引擎建模' }
      },

      // ===== 一级：计量参数补录 =====
      {
        path: 'cet1-param',
        name: 'Cet1Param',
        component: () => import('@/views/params/Cet1Param.vue'),
        meta: { title: 'CET1 参数补录', icon: 'el-icon-money', group: '计量参数补录' }
      },
      {
        path: 'lcr-param',
        name: 'LcrParam',
        component: () => import('@/views/params/LcrParam.vue'),
        meta: { title: 'LCR 参数补录', icon: 'el-icon-tickets', group: '计量参数补录' }
      },
      {
        path: 'nim-param',
        name: 'NimParam',
        component: () => import('@/views/params/NimParam.vue'),
        meta: { title: 'NIM 参数补录', icon: 'el-icon-data-line', group: '计量参数补录' }
      },
      {
        path: 'nsfr-param',
        name: 'NsfrParam',
        component: () => import('@/views/params/NsfrParam.vue'),
        meta: { title: 'NSFR 参数补录', icon: 'el-icon-collection', group: '计量参数补录' }
      },
      {
        path: 'roe-param',
        name: 'RoeParam',
        component: () => import('@/views/params/RoeParam.vue'),
        meta: { title: 'ROE 参数补录', icon: 'el-icon-medal', group: '计量参数补录' }
      },
      {
        path: 'eve-param',
        name: 'EveParam',
        component: () => import('@/views/params/EveParam.vue'),
        meta: { title: 'EVE 参数补录', icon: 'el-icon-coin', group: '计量参数补录' }
      },

      // ===== 一级：反算分析 =====
      {
        path: 'reverse',
        name: 'Reverse',
        component: () => import('@/views/reverse/Index.vue'),
        meta: { title: '测算方案', icon: 'el-icon-position', group: '反算分析' }
      },
      {
        path: 'reverse-dashboard',
        name: 'ReverseDashboard',
        component: () => import('@/views/reverse-dashboard/Index.vue'),
        meta: { title: '反算 Dashboard', icon: 'el-icon-data-analysis', group: '反算分析' }
      },
      {
        path: 'reverse-metric-table',
        name: 'ReverseMetricTable',
        component: () => import('@/views/reverse-metric-table/index.vue'),
        meta: { title: '反算指标结果表', icon: 'el-icon-tickets', group: '反算分析' }
      },
      {
        path: 'reverse-result',
        name: 'ReverseResult',
        component: () => import('@/views/reverse-result/Index.vue'),
        meta: { title: '反算结果查询', icon: 'el-icon-search', group: '反算分析' }
      },
      {
        path: 'balance',
        name: 'Balance',
        component: () => import('@/views/balance/Index.vue'),
        meta: { title: '资产负债表', icon: 'el-icon-money', group: '反算分析' }
      },

      // ===== 一级：系统管理 =====
      {
        path: 'sys',
        name: 'Sys',
        component: () => import('@/views/sys/Index.vue'),
        meta: { title: '系统管理', icon: 'el-icon-setting', group: '系统管理' }
      }
    ]
  }
]

const router = new VueRouter({
  mode: 'history',
  base: '/prcp-java/',
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('prcp-java-token')
  if (to.meta.public) {
    next()
  } else if (!token) {
    next('/login')
  } else {
    next()
  }
})

export default router