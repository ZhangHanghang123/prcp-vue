<template>
  <div class="rate-page">
    <div class="page-header">
      <h2>📈 利率曲线管理</h2>
      <p class="desc">
        利率曲线方案 + 每日利率点（13 期限：d1/d7/m1/m3/m6/y1/y2/y3/y5/y10/y15/y20/y30）+ 历史对比 + 单点查询
      </p>
    </div>

    <!-- 上：曲线方案 -->
    <el-card class="filter-card">
      <div slot="header">
        <span style="1:left">曲线方案列表</span>
        <el-button
          style="1:right"
          type="primary"
          icon="el-icon-plus"
          size="mini"
          @click="onAddScheme"
        >新增曲线方案</el-button>
      </div>
      <el-table :data="schemes" border stripe v-loading="loading.schemes">
        <el-table-column prop="curveCode" label="曲线编码" width="160" />
        <el-table-column prop="curveName" label="曲线名称" />
        <el-table-column prop="currency" label="币种" width="80" align="center" />
        <el-table-column prop="dataSource" label="数据源" width="120" align="center" />
        <el-table-column prop="pointCount" label="利率点数" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="mini" :type="row.pointCount > 0 ? 'success' : 'info'">{{ row.pointCount || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="latestDate" label="最新日期" width="120" align="center" />
        <el-table-column prop="latestY10" label="最新 y10(%)" width="100" align="right">
          <template #default="{ row }">
            <span v-if="row.latestY10 != null">{{ row.f.latestY10 }}</span>
            <span v-else style="color:#999">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="mini">
              {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button type="text" size="mini" @click="onSelectCurve(row)">📊 选择</el-button>
            <el-button type="text" size="mini" @click="onEditScheme(row)">编辑</el-button>
            <el-button type="text" size="mini" style="color:#f56c6c" @click="onDeleteScheme(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 下：当条曲线的利率点编辑 -->
    <el-card v-if="currentCurve" class="table-card" style="margin-top:16px">
      <div slot="header">
        <span style="1:left">
          📅 利率点 · <b>{{ currentCurve.curveCode }}</b> · {{ currentCurve.curveName }}
        </span>
        <span style="1:right">
          <el-date-picker
            v-model="selectedDate"
            type="date"
            value-format="yyyy-MM-dd"
            placeholder="选择数据日期"
            size="small"
            style="width:160px;margin-right:8px"
            @change="loadPoints"
          />
          <el-button
            type="primary"
            icon="el-icon-upload"
            size="mini"
            @click="onUpsertPoint"
          >保存当日利率点</el-button>
          <el-button
            type="success"
            icon="el-icon-data-line"
            size="mini"
            @click="onCompare"
          >历史对比</el-button>
        </span>
      </div>

      <el-row :gutter="12" v-loading="loading.points">
        <el-col
          v-for="t in TERM_KEYS"
          :key="t"
          :span="4"
          style="margin-bottom:12px"
        >
          <div class="rate-cell">
            <div class="rate-term">{{ TERM_LABELS[t] }}</div>
            <el-input-number
              v-model="rateForm[t]"
              :precision="4"
              :step="0.01"
              :min="0"
              :max="50"
              size="small"
              controls-position="right"
              style="width:100%"
              placeholder="%"
            />
          </div>
        </el-col>
      </el-row>

      <div class="summary-bar">
        <el-tag type="info">
          自动计算：曲线平移 <b>{{ shiftBps }}</b> bps · 斜率(y10-y1) <b>{{ slope }}</b>
        </el-tag>
      </div>

      <el-table :data="recentPoints" border size="small" style="margin-top:12px">
        <el-table-column prop="dataDate" label="数据日期" width="120" />
        <el-table-column
          v-for="t in TERM_KEYS"
          :key="t"
          :label="TERM_LABELS[t]"
          align="right"
          :formatter="(row) => row['rate_' + t] != null ? row['rate_' + t].toFixed(4) : '—'"
        />
        <el-table-column prop="curveSlope" label="斜率" width="80" align="right" />
        <el-table-column prop="curveShiftBps" label="平移(bps)" width="100" align="right" />
        <el-table-column prop="remark" label="备注" />
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-button type="text" size="mini" style="color:#f56c6c" @click="onDeletePoint(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 历史对比抽屉 -->
    <el-drawer
      title="历史曲线对比"
      :visible.sync="compareVisible"
      direction="rtl"
      size="60%"
    >
      <div v-loading="loading.compare" style="padding:16px">
        <h4>曲线：{{ compareData.curve_code }} · 共 {{ (compareData.items || []).length }} 个交易日</h4>
        <el-table :data="compareData.items || []" border size="small" stripe>
          <el-table-column prop="dataDate" label="日期" width="120" />
          <el-table-column label="d1" align="right" :formatter="fmt(d1)" width="80" />
          <el-table-column label="m1" align="right" :formatter="fmt(m1)" width="80" />
          <el-table-column label="m3" align="right" :formatter="fmt(m3)" width="80" />
          <el-table-column label="y1" align="right" :formatter="fmt(y1)" width="80" />
          <el-table-column label="y5" align="right" :formatter="fmt(y5)" width="80" />
          <el-table-column label="y10" align="right" :formatter="fmt(y10)" width="80" />
          <el-table-column label="y30" align="right" :formatter="fmt(y30)" width="80" />
          <el-table-column prop="curveSlope" label="斜率" width="80" align="right" />
          <el-table-column prop="curveShiftBps" label="平移(bps)" width="100" align="right" />
        </el-table>
      </div>
    </el-drawer>

    <!-- 新增/编辑曲线方案 -->
    <el-dialog
      :title="editingScheme ? '编辑曲线方案' : '新增曲线方案'"
      :visible.sync="schemeModalVisible"
      width="560px"
    >
      <el-form :model="schemeForm" :rules="schemeRules" ref="schemeFormRef" label-width="100px">
        <el-form-item label="曲线编码" prop="curveCode">
          <el-input v-model="schemeForm.curveCode" :disabled="!!editingScheme" />
        </el-form-item>
        <el-form-item label="曲线名称" prop="curveName">
          <el-input v-model="schemeForm.curveName" />
        </el-form-item>
        <el-form-item label="币种" prop="currency">
          <el-select v-model="schemeForm.currency" style="width:100%">
            <el-option label="CNY 人民币" value="CNY" />
            <el-option label="USD 美元" value="USD" />
            <el-option label="EUR 欧元" value="EUR" />
            <el-option label="HKD 港币" value="HKD" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据源">
          <el-select v-model="schemeForm.dataSource" style="width:100%" clearable>
            <el-option label="WIND" value="WIND" />
            <el-option label="BLOOMBERG" value="BLOOMBERG" />
            <el-option label="中债登" value="CBCD" />
            <el-option label="手工录入" value="MANUAL" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="schemeForm.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="schemeModalVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmitScheme">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { rateApi } from '@/api/rate'

/**
 * @file 利率曲线管理
 * @desc 利率曲线方案 + 每日利率点 (13 期限: d1/d7/m1/m3/m6/y1/y2/y3/y5/y10/y15/y20/y30) + 历史对比 + 单点查询。
 *       布局: 上半 = 曲线方案列表 (选择某条后展开下半) + 下半 = 当条曲线的 13 期限输入 + 自动算曲线平移/斜率 + 最近 30 日历史表 + 历史对比抽屉。
 *
 * @author zhanghh
 * @since 2026-10-09
 *
 * 关联 API:
 *   GET    /rate/scheme                              - 曲线方案列表 (含 pointCount/latestDate/latestY10)
 *   POST   /rate/scheme                              - 新建曲线方案
 *   PUT    /rate/scheme/{id}                         - 更新曲线方案
 *   DELETE /rate/scheme/{id}                         - 删除曲线方案 (级联软删利率点)
 *   GET    /rate/point?curve_code=&data_date=        - 利率点 (单日精确查询)
 *   GET    /rate/point?curve_code=                   - 全部利率点 (用于历史)
 *   POST   /rate/point                               - upsert 当日利率点
 *   DELETE /rate/point/{id}                          - 删除单个利率点
 *   GET    /rate/compare?curve_code=                 - 历史曲线对比
 *
 * 关联组件: 无
 * 关联路由: /rate (group: 利率管理)
 */

const TERM_KEYS = ['d1', 'd7', 'm1', 'm3', 'm6', 'y1', 'y2', 'y3', 'y5', 'y10', 'y15', 'y20', 'y30']
const TERM_LABELS = {
  d1: '1天', d7: '7天', m1: '1月', m3: '3月', m6: '6月',
  y1: '1年', y2: '2年', y3: '3年', y5: '5年',
  y10: '10年', y15: '15年', y20: '20年', y30: '30年'
}

export default {
  name: 'RateCurve',
  data() {
    return {
      TERM_KEYS, TERM_LABELS,
      schemes: [],
      /** 当前选中的曲线方案 (选择后展开下半编辑区) */
      currentCurve: null,
      /** 当前编辑的利率点数据日期 (默认今天) */
      selectedDate: new Date().toISOString().slice(0, 10),
      /** 13 期限利率点编辑表单 {d1: 1.5, d7: 1.55, ...} */
      rateForm: {},
      /** 最近 30 个交易日的利率点 (作为参考) */
      recentPoints: [],
      loading: { schemes: false, points: false, compare: false },
      compareVisible: false,
      compareData: { items: [] },
      schemeModalVisible: false,
      editingScheme: null,
      /** 曲线方案编辑表单 */
      schemeForm: { curveCode: '', curveName: '', currency: 'CNY', dataSource: 'MANUAL', description: '' },
      schemeRules: {
        curveCode: [{ required: true, message: '请输入曲线编码', trigger: 'blur' }],
        curveName: [{ required: true, message: '请输入曲线名称', trigger: 'blur' }]
      },
      submitting: false
    }
  },
  computed: {
    shiftBps() {
      const y10 = this.rateForm.y10, y1 = this.rateForm.y1
      if (y10 == null || y1 == null) return '—'
      return ((y10 - y1) * 100).toFixed(2)
    },
    slope() {
      const y10 = this.rateForm.y10, y1 = this.rateForm.y1
      if (y10 == null || y1 == null) return '—'
      return (y10 - y1).toFixed(4)
    }
  },
  methods: {
    /**
     * <p>表格列 formatter — 返回 (row) => string 函数, 从 row.rates[field] 取数</p>
     *
     * @param {string} field 期限字段名 (d1/m1/y10/...)
     * @returns {Function} formatter 函数
     */
    fmt(field) {
      return (row) => {
        const r = row.rates || {}
        return r[field] != null ? Number(r[field]).toFixed(4) : '—'
      }
    },
    /** 初始化 13 期限为空的 rateForm */
    initRateForm() {
      const f = {}
      TERM_KEYS.forEach(k => { f[k] = null })
      return f
    },
    /**
     * <p>加载曲线方案列表</p>
     *
     * @returns {Promise<void>}
     */
    async loadSchemes() {
      this.loading.schemes = true
      try {
        const res = await rateApi.listSchemes()
        this.schemes = (res && res.items) || []
      } finally {
        this.loading.schemes = false
      }
    },
    /**
     * <p>选中某条曲线方案作为 currentCurve, 立即加载利率点</p>
     *
     * @param {Object} row 曲线方案行
     * @returns {void}
     */
    onSelectCurve(row) {
      this.currentCurve = row
      this.loadPoints()
    },
    /**
     * <p>按当前 currentCurve + selectedDate 加载利率点 + 最近 30 日历史</p>
     *
     * @returns {Promise<void>}
     */
    async loadPoints() {
      if (!this.currentCurve || !this.selectedDate) return
      this.loading.points = true
      try {
        const res = await rateApi.listPoints({
          curve_code: this.currentCurve.curveCode,
          data_date: this.selectedDate
        })
        const items = (res && res.items) || []
        const today = items.find(it => it.dataDate === this.selectedDate)
        if (today) {
          const form = this.initRateForm()
          TERM_KEYS.forEach(k => { form[k] = today['rate_' + k] != null ? Number(today['rate_' + k]) : null })
          this.rateForm = form
        } else {
          this.rateForm = this.initRateForm()
        }
        // 加载最近 30 个交易日作为参考
        const allRes = await rateApi.listPoints({ curve_code: this.currentCurve.curveCode })
        this.recentPoints = (allRes.data && allRes.data.items || []).slice(0, 30)
      } finally {
        this.loading.points = false
      }
    },
    /**
     * <p>保存当日利率点 (upsert, 至少一个期限非空)</p>
     *
     * @returns {Promise<void>}
     */
    async onUpsertPoint() {
      if (!this.currentCurve) {
        this.$message.warning('请先选择一条曲线方案')
        return
      }
      const rates = {}
      TERM_KEYS.forEach(k => { if (this.rateForm[k] != null) rates[k] = this.rateForm[k] })
      if (Object.keys(rates).length === 0) {
        this.$message.warning('请至少输入一个期限点的利率')
        return
      }
      try {
        await rateApi.upsertPoint({
          curve_code: this.currentCurve.curveCode,
          data_date: this.selectedDate,
          rates,
          remark: 'Web 录入'
        })
        this.$message.success('保存成功')
        this.loadPoints()
      } catch (e) {
        this.$message.error('保存失败：' + (e.message || ''))
      }
    },
    /**
     * <p>删除某个利率点 (带 confirm)</p>
     *
     * @param {Object} row 利率点行 (含 id/dataDate)
     * @returns {void}
     */
    onDeletePoint(row) {
      this.$confirm(`确定删除 ${row.dataDate} 的利率点？`, '提示', { type: 'warning' }).then(async () => {
        await rateApi.removePoint(row.id)
        this.$message.success('已删除')
        this.loadPoints()
      }).catch(() => {})
    },
    /**
     * <p>打开历史曲线对比抽屉</p>
     *
     * @returns {Promise<void>}
     */
    async onCompare() {
      if (!this.currentCurve) {
        this.$message.warning('请先选择曲线')
        return
      }
      this.loading.compare = true
      this.compareVisible = true
      try {
        const res = await rateApi.compare({ curve_code: this.currentCurve.curveCode })
        this.compareData = res || { items: [] }
      } finally {
        this.loading.compare = false
      }
    },
    /** 打开新增曲线方案弹窗 */
    onAddScheme() {
      this.editingScheme = null
      this.schemeForm = { curveCode: '', curveName: '', currency: 'CNY', dataSource: 'MANUAL', description: '' }
      this.schemeModalVisible = true
    },
    /**
     * <p>打开编辑曲线方案弹窗, 用行数据回填</p>
     *
     * @param {Object} row 曲线方案行
     * @returns {void}
     */
    onEditScheme(row) {
      this.editingScheme = row
      this.schemeForm = {
        curveCode: row.curveCode,
        curveName: row.curveName,
        currency: row.currency || 'CNY',
        dataSource: row.dataSource || 'MANUAL',
        description: row.description || ''
      }
      this.schemeModalVisible = true
    },
    /**
     * <p>提交曲线方案弹窗 (新增或更新)</p>
     *
     * @returns {Promise<void>}
     */
    async onSubmitScheme() {
      this.$refs.schemeFormRef.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          if (this.editingScheme) {
            await rateApi.updateScheme(this.editingScheme.id, this.schemeForm)
            this.$message.success('已更新')
          } else {
            await rateApi.createScheme(this.schemeForm)
            this.$message.success('已创建')
          }
          this.schemeModalVisible = false
          this.loadSchemes()
        } catch (e) {
          this.$message.error('操作失败：' + (e.message || ''))
        } finally {
          this.submitting = false
        }
      })
    },
    /**
     * <p>删除曲线方案 (级联软删所有利率点, 带 confirm)</p>
     *
     * @param {Object} row 曲线方案行 (含 id/curveName)
     * @returns {void}
     */
    onDeleteScheme(row) {
      this.$confirm(`确定删除曲线「${row.curveName}」？该操作会级联软删所有利率点。`, '提示', { type: 'warning' }).then(async () => {
        await rateApi.removeScheme(row.id)
        this.$message.success('已删除')
        if (this.currentCurve && this.currentCurve.id === row.id) {
          this.currentCurve = null
          this.recentPoints = []
        }
        this.loadSchemes()
      }).catch(() => {})
    }
  },
  mounted() {
    this.rateForm = this.initRateForm()
    this.loadSchemes()
  }
}
</script>

<style scoped>
.rate-page { padding: 16px; }
.page-header h2 { margin: 0 0 4px; color: #303133; }
.page-header .desc { margin: 0 0 16px; color: #909399; font-size: 13px; }
.rate-cell { background: #f5f7fa; padding: 8px; border-radius: 4px; }
.rate-term { font-size: 12px; color: #909399; margin-bottom: 4px; text-align: center; }
.summary-bar { padding: 12px; background: #ecf5ff; border-radius: 4px; margin-top: 8px; }
.summary-bar b { color: #409eff; margin: 0 4px; }
</style>