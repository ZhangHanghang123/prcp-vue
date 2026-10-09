<template>
  <div class="bd-page">
    <div class="page-header">
      <h2>基础数据维护</h2>
      <p class="desc">prcp_data_basic · 64+64 桶结构（m1..m60 + y10/y15/y20/y30）</p>
    </div>

    <el-card class="filter-card">
      <div class="filter-row">
        <el-select v-model="filter.schemeId" placeholder="账户册方案" clearable
                   @change="loadAll" style="width:240px">
          <el-option v-for="s in schemes" :key="s.id"
                     :label="`${s.schemeCode} | ${s.schemeName}`" :value="s.id" />
        </el-select>
        <el-select v-model="filter.dataDate" placeholder="日期" clearable @change="loadAll" style="width:160px">
          <el-option v-for="d in dates" :key="d" :label="d" :value="d" />
        </el-select>
        <el-button icon="el-icon-search" @click="loadAll">查询</el-button>
        <el-button icon="el-icon-refresh-left" @click="onReset">重置</el-button>
        <span class="filter-spacer"></span>
        <el-button icon="el-icon-download" :loading="exporting" @click="onExport">导出 Excel</el-button>
        <el-upload
          :show-file-list="false"
          :auto-upload="false"
          :on-change="onImportFile"
          accept=".xlsx"
          style="display:inline-block">
          <el-button icon="el-icon-upload2" :loading="importing">导入 Excel</el-button>
        </el-upload>
        <el-button icon="el-icon-delete" :disabled="!selection.length" @click="onDeleteBatch">批量删除({{ selection.length }})</el-button>
      </div>
    </el-card>

    <el-tabs v-model="activeTab" type="border-card">
      <!-- 列表 Tab：二级表头分组（基础信息 / 度量 / 原始期限 / 剩余期限 / 操作） -->
      <el-tab-pane label="列表视图" name="list">
        <el-card class="table-card" v-loading="loading.list">
          <div slot="header">
            <span style="float:left">节点 × 期限桶（前 5 年按月 m1~m60 + 长端 10Y/15Y/20Y/30Y，原始/剩余 并列）</span>
            <span style="float:right;color:#999">横向滚动查看全部 128 个桶列</span>
          </div>
          <div style="overflow:auto;max-height:600px">
            <el-table :data="rows" border stripe height="600" :width="listWidth"
                      @selection-change="rows => this.selection = rows">
              <!-- 选择列 -->
              <el-table-column type="selection" width="40" align="center" fixed />

              <!-- 基础信息组：仅保留 数据日期 + 节点编码 + 节点名称 -->
              <el-table-column label="基础信息" align="center">
                <el-table-column type="index" label="#" width="50" align="center" />
                <el-table-column prop="dataDate" label="数据日期" width="110" fixed />
                <el-table-column prop="nodeCode" label="节点编码" width="120" fixed />
                <el-table-column prop="nodeName" label="节点名称" min-width="180" fixed />
              </el-table-column>

              <!-- 度量组：放基础信息后面（4 列） -->
              <el-table-column label="度量" align="center">
                <el-table-column label="当前余额" width="130" align="right"><template #default="{ row }">{{ formatNum(row.currentBalance) }}</template></el-table-column>
                <el-table-column label="平均余额" width="130" align="right"><template #default="{ row }">{{ formatNum(row.avgBalance) }}</template></el-table-column>
                <el-table-column label="加权平均利率" width="130" align="right"><template #default="{ row }">{{ pct(row.weightedRate) }}</template></el-table-column>
                <el-table-column label="利息收支" width="130" align="right"><template #default="{ row }">{{ formatNum(row.interestAmount) }}</template></el-table-column>
              </el-table-column>

              <!-- 原始期限组：m1..m60 + y10/y15/y20/y30 = 64 列 -->
              <el-table-column label="原始期限（orig）" align="center">
                <el-table-column
                  v-for="b in listBuckets" :key="'orig_' + b.key"
                  :label="b.label" width="75" align="right">
                  <template #default="{ row }">
                    <span class="cell-orig">{{ formatNum(row['orig' + b.camel]) }}</span>
                  </template>
                </el-table-column>
              </el-table-column>

              <!-- 剩余期限组：m1..m60 + y10/y15/y20/y30 = 64 列 -->
              <el-table-column label="剩余期限（rem）" align="center">
                <el-table-column
                  v-for="b in listBuckets" :key="'rem_' + b.key"
                  :label="b.label" width="75" align="right">
                  <template #default="{ row }">
                    <span class="cell-rem">{{ formatNum(row['rem' + b.camel]) }}</span>
                  </template>
                </el-table-column>
              </el-table-column>

              <el-table-column label="操作" width="120" align="center" fixed="right">
                <template #default="{ row }">
                  <el-button type="text" @click="onEdit(row)">编辑</el-button>
                  <el-button type="text" style="color:#C9332B" @click="onDelete(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 编辑 Modal -->
    <el-dialog :title="editing ? '编辑节点数据' : '新增节点数据'" :visible.sync="modalVisible" width="880px">
      <el-form :model="form" label-width="100px">
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="数据日期">
              <el-date-picker v-model="form.dataDate" type="date" value-format="yyyy-MM-dd"
                              placeholder="选择日期" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="节点 ID">
              <el-input-number v-model="form.coaNodeId" :min="1" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="偏移">
              <el-input-number v-model="form.dateOffset" :min="0" :max="365" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="单位">
              <el-select v-model="form.offsetUnit" style="width:100%">
                <el-option label="日 D" value="D" />
                <el-option label="周 W" value="W" />
                <el-option label="月 M" value="M" />
                <el-option label="年 Y" value="Y" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="类别">
          <el-radio-group v-model="form.category">
            <el-radio-button label="ASSET">资产</el-radio-button>
            <el-radio-button label="LIABILITY">负债</el-radio-button>
            <el-radio-button label="EQUITY">权益</el-radio-button>
            <el-radio-button label="OFF_BALANCE">表外</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-divider content-position="left">64 个桶（原值 orig / 剩余 rem）</el-divider>
        <el-tabs v-model="modalBucketTab" type="border-card" style="margin-top:-10px">
          <el-tab-pane
            v-for="grp in bucketTabGroups"
            :key="grp.key"
            :label="grp.label"
            :name="grp.key">
            <el-row :gutter="6">
              <el-col v-for="b in grp.buckets" :key="b" :span="12">
                <el-form-item :label="bucketLabel(b) + ' (orig)'" label-width="110px">
                  <el-input-number v-model="form['orig_' + b]" :precision="2" :step="100" size="small" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col v-for="b in grp.buckets" :key="'r_' + b" :span="12">
                <el-form-item :label="bucketLabel(b) + ' (rem)'" label-width="110px">
                  <el-input-number v-model="form['rem_' + b]" :precision="2" :step="100" size="small" style="width:100%" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>
        </el-tabs>
        <el-divider content-position="left">流动性 / 度量</el-divider>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="ASF/RSF">
              <el-select v-model="form.asf_rsf" placeholder="请选择" clearable style="width:100%">
                <el-option label="ASF 资金来源" value="ASF" />
                <el-option label="RSF 资金占用" value="RSF" />
                <el-option label="N/A 不参与" value="N/A" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="HQLA 折算">
              <el-input-number v-model="form.hqla_factor" :min="0" :max="100" :precision="4" :step="0.01" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="计算说明">
              <el-input v-model="form.calc_note" placeholder="可选" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="当前余额">
              <el-input-number v-model="form.current_balance" :precision="2" :step="1000" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="平均余额">
              <el-input-number v-model="form.avg_balance" :precision="2" :step="1000" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="加权平均利率">
              <el-input-number v-model="form.weighted_rate" :precision="6" :step="0.001" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="平均利息收支">
              <el-input-number v-model="form.interest_amount" :precision="2" :step="100" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="风险权重">
              <el-input-number v-model="form.risk_weight" :precision="6" :step="0.01" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="modalVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { basicDataApi } from '@/api/data'
import { coaApi } from '@/api/coa'

/**
 * @file 基础数据维护
 * @desc prcp_data_basic · 64+64 桶结构 (前 5 年按月 m1..m60 + 长端 10Y/15Y/20Y/30Y, 原始/剩余 各一组)。
 *       布局: 顶部筛选条 (方案/日期) + 列表 Tab (二级表头: 基础信息 / 度量 / 原始期限 / 剩余期限 / 操作) + 编辑弹窗 (含 64 桶 Tab 分组) + 导出/导入 Excel。
 *       支持 Excel 导入预览 (dryRun) 和批量删除。
 *
 * @author zhanghh
 * @since 2026-10-09
 *
 * 关联 API:
 *   GET    /data/basic/dates?schemeId=          - 已录入日期列表
 *   GET    /data/basic?schemeId=&dataDate=&coaNodeId= - 列表 (JOIN coa_node 取 nodeCode/nodeName)
 *   POST   /data/basic (upsert)                - 新增/更新单条
 *   DELETE /data/basic/{id}                    - 逻辑删除单条
 *   POST   /data/basic/batch-delete            - 批量删除
 *   POST   /data/basic/preview-xlsx (multipart/form-data, dryRun=true) - Excel 预览
 *   POST   /data/basic/import-xlsx (multipart/form-data, dryRun=false) - 正式导入
 *   GET    /data/basic/export-xlsx?schemeId=&dataDate=&dateOffset=&offsetUnit= - 导出 Excel
 *   GET    /coa/scheme                         - 账户册方案
 *
 * 关联组件: 无
 * 关联路由: /basic-data (group: 基础数据)
 */
export default {
  name: 'BasicDataIndex',
  data() {
    return {
      activeTab: 'list',
      schemes: [],
      dates: [],
      rows: [],
      /** 顶部筛选条件 (方案 ID / 节点 ID / 数据日期) */
      filter: { schemeId: null, coaNodeId: '', dataDate: '' },
      loading: { list: false },
      modalVisible: false,
      editing: null,
      submitting: false,
      modalBucketTab: 'y1',
      /** 编辑弹窗的表单数据 (含 64 桶 orig_/rem_ 字段) */
      form: {
        coaNodeId: null, dataDate: '', category: 'ASSET',
        dateOffset: 0, offsetUnit: 'D',
        asf_rsf: '', hqla_factor: 0, calc_note: '',
        current_balance: 0, avg_balance: 0,
        weighted_rate: 0, interest_amount: 0, risk_weight: 0
      },
      selection: [],  // 列表 Tab 多选
      exporting: false,
      importing: false
    }
  },
  computed: {
    listBuckets() {
      // m1..m60 + y10/y15/y20/y30 = 64 桶
      const out = []
      for (let i = 1; i <= 60; i++) {
        const key = 'm' + i
        out.push({ key, label: i + 'M', camel: 'M' + i })
      }
      out.push({ key: 'y10', label: '10Y', camel: 'Y10' })
      out.push({ key: 'y15', label: '15Y', camel: 'Y15' })
      out.push({ key: 'y20', label: '20Y', camel: 'Y20' })
      out.push({ key: 'y30', label: '30Y', camel: 'Y30' })
      return out
    },
    listWidth() {
      // 选择 40 + 基础信息 50+110+120+180 = 460
      // 度量 130×4 = 520
      // 原始/剩余 各 64 × 75 = 4800，共 9600
      // 操作 120
      return 40 + 460 + 520 + 64 * 75 * 2 + 120
    },
    bucketTabGroups() {
      const out = []
      for (let y = 1; y <= 5; y++) {
        const start = (y - 1) * 12 + 1
        const end = y * 12
        const buckets = []
        for (let i = start; i <= end; i++) buckets.push('m' + i)
        out.push({ key: 'y' + y, label: '第 ' + y + ' 年（m' + start + '~m' + end + '）', buckets })
      }
      out.push({ key: 'long', label: '长端（y10/y15/y20/y30）', buckets: ['y10', 'y15', 'y20', 'y30'] })
      return out
    }
  },
  async mounted() {
    // 初始化 form（含 64 桶）
    this.form = this.newForm()
    try {
      this.schemes = (await coaApi.listSchemes()) || []
    } catch (e) {
      console.error('[loadSchemes]', e)
      this.schemes = []
    }
    // 默认选第一个方案
    if (this.schemes.length && !this.filter.schemeId) {
      this.filter.schemeId = this.schemes[0].id
    }
    await this.loadAll()
  },
  methods: {
    /** 构造空 form (含 64 桶 orig/rem = 0) */
    newForm() {
      const form = {
        coaNodeId: null, dataDate: '', category: 'ASSET',
        dateOffset: 0, offsetUnit: 'D',
        asf_rsf: '', hqla_factor: 0, calc_note: '',
        current_balance: 0, avg_balance: 0,
        weighted_rate: 0, interest_amount: 0, risk_weight: 0
      }
      // 初始化 64 桶 orig/rem = 0
      const buckets = this.listBuckets
      buckets.forEach(b => {
        form['orig_' + b.key] = 0
        form['rem_' + b.key] = 0
      })
      return form
    },
    /**
     * <p>把后端桶 key (m1..m60, y10/y15/y20/y30) 格式化为展示标签</p>
     *
     * @param {string} k 桶 key (m1..m60 或 y10/y15/y20/y30)
     * @returns {string} 显示标签 (如 '1M', '10Y')
     */
    bucketLabel(k) {
      if (k.startsWith('m')) return k.substring(1) + 'M'
      if (k.startsWith('y')) return k.substring(1) + 'Y'
      return k
    },
    /**
     * <p>并行加载已录入日期列表 + 当前筛选的明细列表</p>
     *
     * @returns {Promise<void>}
     */
    async loadAll() {
      this.loading.list = true
      try {
        const promises = [
          basicDataApi.dates(this.filter.schemeId),
          basicDataApi.list(this.filter)
        ]
        const [datesRes, listRes] = await Promise.all(promises)
        this.dates = datesRes || []
        this.rows = listRes || []
      } finally {
        this.loading.list = false
      }
    },
    /** 重置节点 ID + 日期 (保留方案), 然后刷新 */
    onReset() {
      this.filter = { schemeId: this.filter.schemeId, coaNodeId: '', dataDate: '' }
      this.loadAll()
    },
    /**
     * <p>数值格式化 (空 → '-', 否则 zh-CN 千分位 + 最多 2 位小数)</p>
     *
     * @param {number|string} v 数值
     * @returns {string} 格式化字符串
     */
    formatNum(v) {
      if (v == null || v === '') return '-'
      const n = Number(v)
      if (Number.isNaN(n)) return v
      return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
    },
    /**
     * <p>小数 → 百分比显示 (0.045 → "4.50%")</p>
     *
     * @param {number|string} v 0~1 小数
     * @returns {string} 百分比字符串
     */
    pct(v) {
      if (v == null || v === '') return '-'
      const n = Number(v)
      if (Number.isNaN(n)) return v
      return (n * 100).toFixed(2) + '%'
    },
    /**
     * <p>类别名映射为 Element UI tag 类型</p>
     *
     * @param {string} cat 类别 (ASSET/LIABILITY/EQUITY/OFF_BALANCE)
     * @returns {string} tag 类型
     */
    categoryTagType(cat) {
      if (cat === 'ASSET') return 'danger'
      if (cat === 'LIABILITY') return 'warning'
      if (cat === 'EQUITY') return 'success'
      if (cat === 'OFF_BALANCE') return 'info'
      return ''
    },
    /**
     * <p>打开编辑弹窗, 用行数据回填表单 (含 64 桶)</p>
     *
     * @param {Object} row 表格行
     * @returns {void}
     */
    onEdit(row) {
      this.editing = row
      this.form = this.newForm()
      this.form.coaNodeId = row.coaNodeId
      this.form.dataDate = row.dataDate
      this.form.category = row.category || 'ASSET'
      this.form.dateOffset = row.dateOffset || 0
      this.form.offsetUnit = row.offsetUnit || 'D'
      // 预填 64 桶（m1..m60 + y10/y15/y20/y30）
      this.listBuckets.forEach(b => {
        this.form['orig_' + b.key] = Number(row['orig' + b.camel]) || 0
        this.form['rem_' + b.key] = Number(row['rem' + b.camel]) || 0
      })
      // 预填度量
      this.form.asf_rsf = row.asfRsf || ''
      this.form.hqla_factor = Number(row.hqlaFactor) || 0
      this.form.calc_note = row.calcNote || ''
      this.form.current_balance = Number(row.currentBalance) || 0
      this.form.avg_balance = Number(row.avgBalance) || 0
      this.form.weighted_rate = Number(row.weightedRate) || 0
      this.form.interest_amount = Number(row.interestAmount) || 0
      this.form.risk_weight = Number(row.riskWeight) || 0
      this.modalVisible = true
    },
    /**
     * <p>删除单条 (带 confirm 二次确认)</p>
     *
     * @param {Object} row 表格行 (含 id/nodeCode/dataDate)
     * @returns {void}
     */
    onDelete(row) {
      this.$confirm(`确认逻辑删除 [${row.nodeCode}] ${row.dataDate}？`, '提示', { type: 'warning' })
        .then(async () => {
          await basicDataApi.remove(row.id)
          this.$message.success('已删除')
          this.loadAll()
        }).catch(() => {})
    },
    /**
     * <p>提交编辑弹窗 (upsert: 有 id 则更新, 无则新增)</p>
     *
     * @returns {Promise<void>}
     */
    async onSubmit() {
      this.submitting = true
      try {
        await basicDataApi.upsert(this.form)
        this.$message.success('保存成功')
        this.modalVisible = false
        this.loadAll()
      } finally { this.submitting = false }
    },
    /**
     * <p>导出当前筛选条件下的 Excel (带 token 鉴权)</p>
     *
     * @returns {Promise<void>}
     */
    async onExport() {
      if (!this.filter.schemeId) { this.$message.warning('请先选择账户册方案'); return }
      if (!this.filter.dataDate) { this.$message.warning('请先选择数据日期'); return }
      this.exporting = true
      try {
        const params = {
          schemeId: this.filter.schemeId,
          dataDate: this.filter.dataDate,
          dateOffset: 0,
          offsetUnit: 'D'
        }
        const token = localStorage.getItem('token') || ''
        const url = '/prcp-java/api' + basicDataApi.exportXlsxUrl(params)
        const resp = await fetch(url, { headers: { Authorization: token ? 'Bearer ' + token : '' } })
        if (!resp.ok) throw new Error('HTTP ' + resp.status)
        const blob = await resp.blob()
        const cd = resp.headers.get('Content-Disposition') || ''
        let filename = 'prcp_basic.xlsx'
        const m = cd.match(/filename="?([^";]+)"?/)
        if (m) filename = decodeURIComponent(m[1])
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = filename
        document.body.appendChild(a); a.click(); a.remove()
        URL.revokeObjectURL(a.href)
        this.$message.success('已导出：' + filename)
      } catch (e) {
        this.$message.error('导出失败：' + e.message)
      } finally { this.exporting = false }
    },
    /**
     * <p>Excel 导入 (两步: 预览 dryRun=true → 用户确认 → 正式导入 dryRun=false)</p>
     *
     * @param {Object} file el-upload on-change 回调入参 (含 raw: File)
     * @returns {Promise<void>}
     */
    async onImportFile(file) {
      if (!this.filter.schemeId) { this.$message.warning('请先选择账户册方案'); return }
      if (!file || !file.raw) return
      // 1) 先预览（dryRun=true）
      this.importing = true
      try {
        const fd = new FormData()
        fd.append('file', file.raw)
        fd.append('schemeId', this.filter.schemeId)
        fd.append('dateOffset', 0)
        fd.append('offsetUnit', 'D')
        const preview = await basicDataApi.previewXlsx(fd)
        const okCount = preview.inserted || 0
        const totalErr = preview.totalErrors || 0
        const firstErrors = (preview.errors || []).slice(0, 5).join('\n') || '无'
        // 2) 询问确认入库
        await this.$confirm(
          `校验通过：${okCount} 行可入库；错误：${totalErr} 条\n\n前 5 条错误：\n${firstErrors}\n\n确认导入？`,
          '导入预览',
          { type: totalErr > 0 ? 'warning' : 'success' }
        ).catch(() => { this.importing = false; throw new Error('用户取消') })
        // 3) 正式导入（dryRun=false）
        const r = await basicDataApi.importXlsx(fd, false)
        this.$message.success(`导入完成：inserted=${r.inserted}, updated=${r.updated}, skipped=${r.skipped}, errors=${r.totalErrors}`)
        this.loadAll()
      } catch (e) {
        if (e.message && e.message !== '用户取消') this.$message.error('导入失败：' + e.message)
      } finally { this.importing = false }
    },
    /**
     * <p>批量删除 (按 selection 多选)</p>
     *
     * @returns {Promise<void>}
     */
    async onDeleteBatch() {
      if (!this.selection.length) return
      const ids = this.selection.map(r => r.id).filter(Boolean)
      if (!ids.length) { this.$message.warning('所选行无 id'); return }
      try {
        await this.$confirm(`确认逻辑删除 ${ids.length} 条？`, '批量删除', { type: 'warning' })
      } catch { return }
      try {
        const r = await basicDataApi.deleteBatch(ids)
        this.$message.success(`已删除 ${r.deleted} 条`)
        this.selection = []
        this.loadAll()
      } catch (e) {
        this.$message.error('删除失败：' + e.message)
      }
    }
  }
}
</script>

<style scoped>
.bd-page { padding: 0; }
.page-header {
  background: #fff; padding: 16px 24px; margin-bottom: 16px; border-bottom: 1px solid #f0f0f0;
}
.page-header h2 { margin: 0; }
.page-header .desc { color: #999; font-size: 13px; margin: 4px 0 0; }
.filter-card { margin: 0 16px 16px; }
.table-card { margin: 0 16px; }

/* 筛选条横向 + 不堆叠 */
.filter-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.filter-spacer { flex: 1; }

/* 表格所有列不换行（数值与中文都一行显示） */
.table-card >>> .el-table th, .table-card >>> .el-table td {
  white-space: nowrap;
}
.cell-pair { display:flex; flex-direction:column; line-height:1.3; padding:2px 0; }
.cell-single { font-size:11px; line-height:1.3; padding:2px 0; }
.cell-orig { color:#C7000B; font-size:12px; }
.cell-rem { color:#999; font-size:11px; }

/* 按方案矩阵：大类汇总卡片 */
.category-summary { padding: 0 16px 16px; }
.cat-card { border-radius: 6px; }
.cat-title { display:flex; align-items:center; justify-content:space-between; }
.cat-sub { font-size:13px; color:#409EFF; font-weight:600; }
.metric-mini { display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed #f0f0f0; font-size:12px; }
.metric-mini .lab { color:#999; }
.metric-mini .val { color:#333; font-weight:500; }
</style>