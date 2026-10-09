<template>
  <div class="reverse-result-page">
    <!-- 顶部筛选 -->
    <el-card class="filter-card" shadow="never">
      <div slot="header" class="filter-header">
        <span><i class="el-icon-search"></i> 反算结果查询 · 数据过滤</span>
        <span class="header-hint">数据源：prcp_data_reverse（基于测算方案 + 运行 + 月份）</span>
      </div>
      <el-form :inline="true" size="small" class="filter-form">
        <el-form-item label="测算方案">
          <el-select v-model="filter.schemeCode" filterable clearable placeholder="选择方案编码"
                     style="width:220px" @change="onSchemeChange">
            <el-option v-for="s in schemes" :key="s.scheme_code"
                       :label="`${s.scheme_code} (${s.run_count} 运行 / ${s.total_rows} 行)`"
                       :value="s.scheme_code" />
          </el-select>
        </el-form-item>
        <el-form-item label="运行记录">
          <el-select v-model="filter.runId" filterable clearable placeholder="选择 SUCCESS 运行"
                     style="width:260px" :disabled="!filter.schemeCode" @change="onRunChange">
            <el-option v-for="r in runs" :key="r.id"
                       :label="`#${r.id} ${r.run_code} · ${r.status} · ${r.row_count || 0} 行`"
                       :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="预测月份">
          <el-select v-model="filter.dateOffset" clearable placeholder="选择预测月"
                     style="width:200px" :disabled="!filter.schemeCode">
            <el-option v-for="d in dates" :key="`${d.data_date}_${d.date_offset}`"
                       :label="`M${d.date_offset} · ${d.data_date}`"
                       :value="d.date_offset" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button icon="el-icon-search" :loading="loading.matrix"
                     :disabled="!filter.schemeCode" @click="loadMatrix">查询</el-button>
          <el-button icon="el-icon-refresh" @click="reset">重置</el-button>
          <el-button type="success" icon="el-icon-download" :disabled="!filter.schemeCode"
                     @click="downloadXlsx">导出 Excel</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Tab -->
    <el-tabs v-model="activeTab" type="border-card" class="result-tabs">
      <!-- Tab 1: 账户册矩阵 -->
      <el-tab-pane label="账户册矩阵" name="matrix">
        <el-card class="table-card" v-loading="loading.matrix">
          <div slot="header" class="card-header">
            <span>
              <i class="el-icon-grid"></i>
              节点 × 期限桶（{{ matrixTotal }} 节点 × 64 orig + 64 rem 桶 + 7 度量）
            </span>
            <span class="header-hint">横向滚动查看全部 128 个桶列</span>
          </div>
          <div class="matrix-table-wrap">
            <el-table :data="matrix.rows" border stripe size="mini"
                      :width="matrixWidth" height="640">
              <el-table-column prop="node_code" label="节点编码" width="100" fixed />
              <el-table-column prop="node_name" label="节点名称" width="160" fixed
                               show-overflow-tooltip />
              <el-table-column label="层级" width="60" align="center" fixed>
                <template #default="{ row }">
                  <el-tag size="mini" :type="row.node_level === 1 ? 'primary' : (row.node_level === 2 ? 'success' : 'info')">
                    L{{ row.node_level }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="category" label="大类" width="90" align="center" fixed>
                <template #default="{ row }">
                  <el-tag size="mini" :type="catTagType(row.category)">{{ row.category || '-' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="原始期限" align="center">
                <el-table-column v-for="k in buckets" :key="'o_' + k"
                                 :label="bucketLabel(k)" align="right" width="62"
                                 :render-header="renderHeader('原始期限')">
                  <template #default="{ row }">
                    <div class="cell-orig">{{ formatNum(row['orig' + k.toUpperCase()]) }}</div>
                  </template>
                </el-table-column>
              </el-table-column>
              <el-table-column label="剩余期限" align="center">
                <el-table-column v-for="k in buckets" :key="'r_' + k"
                                 :label="bucketLabel(k)" align="right" width="62"
                                 :render-header="renderHeader('剩余期限')">
                  <template #default="{ row }">
                    <div class="cell-rem">{{ formatNum(row['rem' + k.toUpperCase()]) }}</div>
                  </template>
                </el-table-column>
              </el-table-column>
              <el-table-column label="度量" align="center">
                <el-table-column prop="asf_rsf" label="ASF/RSF" width="80" align="center" />
                <el-table-column label="HQLA" width="80" align="right" prop="hqla_factor">
                  <template #default="{ row }">{{ formatNum(row.hqla_factor) }}</template>
                </el-table-column>
                <el-table-column label="当前余额" width="130" align="right" prop="current_balance">
                  <template #default="{ row }">{{ formatNum(row.current_balance) }}</template>
                </el-table-column>
                <el-table-column label="平均余额" width="130" align="right" prop="avg_balance">
                  <template #default="{ row }">{{ formatNum(row.avg_balance) }}</template>
                </el-table-column>
                <el-table-column label="加权利率%" width="100" align="right" prop="weighted_rate">
                  <template #default="{ row }">{{ pct(row.weighted_rate) }}</template>
                </el-table-column>
                <el-table-column label="利息" width="120" align="right" prop="interest_amount">
                  <template #default="{ row }">{{ formatNum(row.interest_amount) }}</template>
                </el-table-column>
                <el-table-column label="风险权重%" width="100" align="right" prop="risk_weight">
                  <template #default="{ row }">{{ pct(row.risk_weight) }}</template>
                </el-table-column>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- Tab 2: 大类汇总 -->
      <el-tab-pane label="大类汇总" name="category">
        <el-card class="table-card" v-loading="loading.summary">
          <div slot="header" class="card-header">
            <span>
              <i class="el-icon-pie-chart"></i>
              大类汇总 · 按 category 聚合 5 类（ASSET / LIABILITY / EQUITY / OFF_BALANCE / OTHER）
            </span>
            <span class="header-hint">{{ summaryTotal }} 大类</span>
          </div>
          <el-table :data="summary" border stripe size="small" height="500">
            <el-table-column prop="category" label="大类" width="160" fixed>
              <template #default="{ row }">
                <el-tag size="mini" :type="catTagType(row.category)">{{ row.category }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="node_count" label="节点数" width="100" align="right" sortable />
            <el-table-column label="当前余额合计" width="180" align="right" prop="total_current_balance" sortable>
              <template #default="{ row }">{{ formatNum(row.total_current_balance) }}</template>
            </el-table-column>
            <el-table-column label="平均余额合计" width="180" align="right" prop="total_avg_balance" sortable>
              <template #default="{ row }">{{ formatNum(row.total_avg_balance) }}</template>
            </el-table-column>
            <el-table-column label="利息合计" width="160" align="right" prop="total_interest" sortable>
              <template #default="{ row }">{{ formatNum(row.total_interest) }}</template>
            </el-table-column>
            <el-table-column label="原始期限合计（按年）" align="center">
              <el-table-column
                v-for="k in buckets" :key="'so_' + k"
                :label="bucketLabel(k)" align="right" width="80"
                :render-header="renderHeader('原始期限')">
                <template #default="{ row }">{{ formatNum(row['total_orig_' + k]) }}</template>
              </el-table-column>
            </el-table-column>
            <el-table-column label="剩余期限合计（按年）" align="center">
              <el-table-column
                v-for="k in buckets" :key="'sr_' + k"
                :label="bucketLabel(k)" align="right" width="80"
                :render-header="renderHeader('剩余期限')">
                <template #default="{ row }">{{ formatNum(row['total_rem_' + k]) }}</template>
              </el-table-column>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import { reverseResultApi } from '@/api/reverse-result'

export default {
  name: 'ReverseResultIndex',
  data() {
    return {
      activeTab: 'matrix',
      // 方案 / 运行 / 月份
      schemes: [],
      runs: [],
      dates: [],
      // 筛选
      filter: {
        schemeCode: '',
        runId: null,
        dateOffset: null
      },
      // 矩阵 / 汇总
      buckets: [],
      matrix: { rows: [], buckets: [], total: 0 },
      summary: [],
      loading: { matrix: false, summary: false, schemes: false }
    }
  },
  computed: {
    matrixTotal() {
      return this.matrix.rows.length
    },
    summaryTotal() {
      return this.summary.length
    },
    matrixWidth() {
      // 节点列 100+160+60+90 = 410；每个桶 64 × 2 (orig+rem) × 62 = 7936；度量 8 × ~110 = 880
      return 410 + this.buckets.length * 2 * 62 + 880
    }
  },
  async mounted() {
    this.buckets = ['m1', 'm3', 'm6', 'm12', 'y10', 'y15', 'y20', 'y30']
    await this.loadSchemes()
  },
  methods: {
    async loadSchemes() {
      this.loading.schemes = true
      try {
        const r = await reverseResultApi.schemes()
        this.schemes = (r.data && r.data.items) || r.items || []
        // 自动选第一条
        if (this.schemes.length && !this.filter.schemeCode) {
          this.filter.schemeCode = this.schemes[0].scheme_code
          await this.onSchemeChange()
        }
      } catch (e) {
        this.$message.error('加载方案列表失败：' + (e.message || ''))
      } finally { this.loading.schemes = false }
    },

    async onSchemeChange() {
      this.filter.runId = null
      this.filter.dateOffset = null
      this.runs = []
      this.dates = []
      if (!this.filter.schemeCode) return
      try {
        const r = await reverseResultApi.runs({ scheme_code: this.filter.schemeCode })
        this.runs = (r.data && r.data.items) || r.items || []
        // 自动选第一条
        if (this.runs.length) {
          this.filter.runId = this.runs[0].id
          await this.onRunChange()
        }
        // 自动触发查询
        await this.loadMatrix()
      } catch (e) {
        this.$message.error('加载运行列表失败：' + (e.message || ''))
      }
    },

    async onRunChange() {
      this.filter.dateOffset = null
      this.dates = []
      if (!this.filter.schemeCode) return
      try {
        const r = await reverseResultApi.dates({
          scheme_code: this.filter.schemeCode,
          run_id: this.filter.runId
        })
        this.dates = (r.data && r.data.items) || r.items || []
      } catch (e) {
        this.$message.error('加载月份列表失败：' + (e.message || ''))
      }
    },

    async loadMatrix() {
      if (!this.filter.schemeCode) {
        this.$message.warning('请先选择方案')
        return
      }
      this.loading.matrix = true
      try {
        const r = await reverseResultApi.bySchemeMatrix({
          scheme_code: this.filter.schemeCode,
          run_id: this.filter.runId,
          date_offset: this.filter.dateOffset
        })
        const data = (r.data && r.data.rows !== undefined) ? r.data : (r.rows !== undefined ? r : { rows: [] })
        this.matrix = {
          rows: data.rows || [],
          buckets: data.buckets || this.buckets,
          total: data.total || (data.rows || []).length
        }
        this.$message.success(`已加载 ${this.matrix.rows.length} 个节点`)
      } catch (e) {
        this.$message.error('加载矩阵失败：' + (e.message || ''))
      } finally { this.loading.matrix = false }
      // 同步加载汇总
      this.loadSummary()
    },

    async loadSummary() {
      if (!this.filter.schemeCode) return
      this.loading.summary = true
      try {
        const r = await reverseResultApi.categorySummary({
          scheme_code: this.filter.schemeCode,
          run_id: this.filter.runId,
          date_offset: this.filter.dateOffset
        })
        this.summary = (r.data && r.data.items) || r.items || []
      } catch (e) {
        this.$message.error('加载大类汇总失败：' + (e.message || ''))
      } finally { this.loading.summary = false }
    },

    reset() {
      this.filter = { schemeCode: '', runId: null, dateOffset: null }
      this.runs = []
      this.dates = []
      this.matrix = { rows: [], buckets: [], total: 0 }
      this.summary = []
    },

    downloadXlsx() {
      if (!this.filter.schemeCode) {
        this.$message.warning('请先选择方案')
        return
      }
      const url = reverseResultApi.exportXlsxUrl({
        scheme_code: this.filter.schemeCode,
        run_id: this.filter.runId
      })
      window.open(url, '_blank')
    },

    formatNum(v) {
      if (v == null || v === '') return '-'
      const n = Number(v)
      if (Number.isNaN(n)) return v
      return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
    },
    pct(v) {
      if (v == null || v === '') return '-'
      const n = Number(v)
      if (Number.isNaN(n)) return v
      return (n * 100).toFixed(2) + '%'
    },
    bucketLabel(k) {
      if (!k) return ''
      if (k.startsWith('m')) return k.substring(1) + 'M'
      if (k.startsWith('y')) return k.substring(1) + 'Y'
      return k
    },
    catTagType(cat) {
      const s = (cat == null ? '' : String(cat)).toLowerCase()
      if (s.includes('asset') || s === '资产') return 'danger'
      if (s.includes('liab') || s === '负债') return 'warning'
      if (s.includes('equity') || s === '权益') return 'success'
      if (s.includes('off') || s === '表外') return 'info'
      return ''
    },
    renderHeader(tip) {
      return (h, { column }) => h('span', { attrs: { title: tip } }, [column.label])
    }
  }
}
</script>

<style scoped>
.reverse-result-page { padding: 12px; }
.filter-card { margin-bottom: 12px; }
.filter-header { display: flex; justify-content: space-between; align-items: center; }
.filter-header .header-hint { font-size: 12px; color: #909399; font-weight: normal; }
.filter-form { margin-bottom: 0; }
.result-tabs { background: #fff; }
.table-card { margin-bottom: 12px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-header .header-hint { font-size: 12px; color: #909399; font-weight: normal; }
.matrix-table-wrap { overflow-x: auto; max-width: 100%; }
.cell-orig { color: #008685; font-size: 11px; font-weight: 500; }
.cell-rem  { color: #7D6FFC; font-size: 11px; font-weight: 500; }
</style>