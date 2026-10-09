<template>
  <div class="balance-page" v-loading="loading">
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" size="small">
        <el-form-item label="账户册方案">
          <el-select v-model="filters.scheme_id" filterable style="width:240px" @change="loadMatrix">
            <el-option v-for="s in schemes" :key="s.id" :label="`${s.schemeCode} - ${s.schemeName}`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="起始月">
          <el-date-picker v-model="filters.start_date" type="month" value-format="yyyy-MM-dd" style="width:140px" @change="loadMatrix" />
        </el-form-item>
        <el-form-item label="结束月">
          <el-date-picker v-model="filters.end_date" type="month" value-format="yyyy-MM-dd" style="width:140px" @change="loadMatrix" />
        </el-form-item>
        <el-form-item>
          <el-button icon="el-icon-refresh" @click="loadMatrix">刷新</el-button>
          <el-button icon="el-icon-download" @click="downloadXlsx">导出 Excel</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 3 大类汇总 -->
    <el-row :gutter="12" class="kpi-row">
      <el-col :span="8" v-for="cat in categoryList" :key="cat.category">
        <el-card shadow="never" class="kpi-card" :body-style="{padding:'12px 16px'}">
          <div class="kpi-label">{{ cat.category }}（{{ cat.account_count }} 账户）</div>
          <div class="kpi-value">{{ fmtMoney(cat.total_amount) }}</div>
          <div class="kpi-sub">加权利率 {{ Number(cat.weighted_rate).toFixed(4) }}% | 资本占用 {{ Number(cat.weighted_capital).toFixed(2) }}% | 风险权重 {{ Number(cat.weighted_risk_weight).toFixed(2) }}%</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 节点 × 月份 × 7 指标矩阵 -->
    <el-card shadow="never">
      <div slot="header" class="chart-header">
        <span>📊 账户册矩阵（{{ dates.length }} 月 × {{ nodes.length }} 节点 × 7 指标）</span>
      </div>
      <el-table :data="tableRows" border stripe size="mini" max-height="500">
        <el-table-column prop="node_code" label="编码" width="100" fixed="left" />
        <el-table-column prop="node_name" label="名称" min-width="180" fixed="left" show-overflow-tooltip />
        <el-table-column prop="category" label="大类" width="100" fixed="left">
          <template slot-scope="s">
            <el-tag size="mini" :type="catType(s.row.category)">{{ s.row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-for="(m, mi) in dates" :key="m" :label="m" align="center">
          <el-table-column label="月初" align="right" width="100">
            <template slot-scope="s">{{ fmtMoney(getMeasure(s.row, m, 'begin_balance')) }}</template>
          </el-table-column>
          <el-table-column label="月末" align="right" width="100">
            <template slot-scope="s">{{ fmtMoney(getMeasure(s.row, m, 'current_amount')) }}</template>
          </el-table-column>
          <el-table-column label="平均" align="right" width="100">
            <template slot-scope="s">{{ fmtMoney(getMeasure(s.row, m, 'avg_balance')) }}</template>
          </el-table-column>
          <el-table-column label="利率%" align="right" width="80">
            <template slot-scope="s">{{ fmtNum(getMeasure(s.row, m, 'interest_rate'), 4) }}</template>
          </el-table-column>
          <el-table-column label="利息" align="right" width="100">
            <template slot-scope="s">{{ fmtMoney(getMeasure(s.row, m, 'interest_amount')) }}</template>
          </el-table-column>
          <el-table-column label="资本%" align="right" width="80">
            <template slot-scope="s">{{ fmtNum(getMeasure(s.row, m, 'capital_ratio'), 2) }}</template>
          </el-table-column>
          <el-table-column label="风险%" align="right" width="80">
            <template slot-scope="s">{{ fmtNum(getMeasure(s.row, m, 'risk_weight'), 2) }}</template>
          </el-table-column>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { balanceApi } from '@/api/balance'
import { coaApi } from '@/api/coa'

/**
 * @file 账户册余额矩阵页
 * @desc 按账户册方案 + 起止月份, 展示节点 × 月份 × 7 指标 (月初/月末/平均/利率/利息/资本%/风险%) 矩阵。
 *       顶部 3 大类汇总卡片 (ASSET/LIABILITY/...) + 主表格 (按节点聚合, 横向滚动)。
 *       默认起始月 2026-01-01, 结束月 2026-03-01。
 *
 * @author zhanghh
 * @since 2026-10-09
 *
 * 关联 API:
 *   GET  /balance/by-scheme-matrix?scheme_id=&start_date=&end_date= - 矩阵数据 (后端 com.prcp.balance)
 *   GET  /coa/scheme       - 账户册方案列表
 *   GET  /balance/export-xlsx - 导出 Excel (window.open 直链)
 *
 * 关联组件: 无
 * 关联路由: /balance (group: 数据视图)
 */
export default {
  name: 'BalanceIndex',
  data() {
    return {
      loading: false,
      schemes: [],
      /** 顶部筛选条件 (方案 ID / 起始月 / 结束月) */
      filters: { scheme_id: null, start_date: '2026-01-01', end_date: '2026-03-01' },
      /** 矩阵数据: matrix[nodeId][ym] = {begin_balance, current_amount, ...} */
      matrix: {},
      nodes: [],
      dates: [],
      categories: {}
    }
  },
  computed: {
    categoryList() { return Object.values(this.categories || {}).flatMap(ymMap => Object.entries(ymMap).map(([k, v]) => ({ ...v, _ym: k }))).slice(0, 3) },
    tableRows() {
      // 按节点聚合：每个节点一行
      const rows = []
      const seen = new Map()
      for (const n of this.nodes) {
        const cid = String(n.coa_node_id)
        const m = this.matrix[cid] || {}
        rows.push({ ...n, _measures: m })
        seen.set(cid, true)
      }
      return rows
    }
  },
  mounted() {
    this.loadSchemes()
    if (this.filters.scheme_id) this.loadMatrix()
  },
  methods: {
    /**
     * <p>金额格式化 (空 → '-', 否则按 zh-CN 千分位 + 最多 2 位小数)</p>
     *
     * @param {number} v 原始金额
     * @returns {string} 格式化字符串
     */
    fmtMoney(v) { if (v == null) return '-'; return Number(v).toLocaleString('zh-CN', { maximumFractionDigits: 2 }) },
    /**
     * <p>数值格式化 (保留 p 位小数)</p>
     *
     * @param {number} v 原始数值
     * @param {number} p 小数位数 (默认 2)
     * @returns {string} 格式化字符串
     */
    fmtNum(v, p) { if (v == null) return '-'; return Number(v).toFixed(p || 2) },
    /**
     * <p>大类名映射为 Element UI tag 类型</p>
     *
     * @param {string} c 大类 (ASSET/LIABILITY/OFF_BALANCE/EQUITY)
     * @returns {string} tag 类型
     */
    catType(c) { return { ASSET: 'success', LIABILITY: 'warning', OFF_BALANCE: '', EQUITY: 'info' }[c] || '' },
    /**
     * <p>从 matrix 嵌套结构中取出某节点某月份某指标</p>
     *
     * @param {Object} row 表格行 (含 _measures)
     * @param {string} ym 月份 (yyyy-MM-dd)
     * @param {string} key 指标 key
     * @returns {number} 指标值
     */
    getMeasure(row, ym, key) {
      const m = (row._measures || {})[ym] || {}
      return m[key]
    },
    /**
     * <p>加载账户册方案列表, 默认选第一个并触发矩阵加载</p>
     *
     * @returns {Promise<void>}
     */
    async loadSchemes() {
      try {
        const r = await coaApi.listSchemes()
        this.schemes = (r.data && r.data.items) || r.items || (Array.isArray(r) ? r : (Array.isArray(r.data) ? r.data : []))
        if (!this.filters.scheme_id && this.schemes.length > 0) this.filters.scheme_id = this.schemes[0].id
        if (this.filters.scheme_id) this.loadMatrix()
      } catch (e) { console.warn(e) }
    },
    /**
     * <p>按当前 filters 加载余额矩阵</p>
     *
     * @returns {Promise<void>}
     */
    async loadMatrix() {
      if (!this.filters.scheme_id) return
      this.loading = true
      try {
        const r = await balanceApi.bySchemeMatrix({
          scheme_id: this.filters.scheme_id,
          start_date: this.filters.start_date,
          end_date: this.filters.end_date
        })
        const d = r.data || r
        this.dates = d.dates || []
        this.nodes = d.nodes || []
        this.matrix = d.matrix || {}
        this.categories = d.categories || {}
      } catch (e) {
        this.$message.error('加载矩阵失败：' + (e.message || ''))
      } finally { this.loading = false }
    },
    /** 打开导出 Excel 直链 (新窗口) */
    downloadXlsx() {
      const url = balanceApi.exportXlsxUrl(this.filters.scheme_id, this.filters.start_date, this.filters.end_date)
      window.open(url, '_blank')
    }
  }
}
</script>

<style scoped>
.balance-page { padding: 12px; }
.filter-card { margin-bottom: 12px; }
.kpi-row { margin-bottom: 12px; }
.kpi-card { padding: 4px 0; }
.kpi-label { font-size: 12px; color: #909399; }
.kpi-value { font-size: 22px; font-weight: bold; margin: 4px 0; }
.kpi-sub { font-size: 11px; color: #606266; }
.chart-header { display: flex; justify-content: space-between; align-items: center; }
</style>