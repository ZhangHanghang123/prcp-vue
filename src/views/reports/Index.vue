<template>
  <div class="rpt-page">
    <div class="page-header">
      <h2>报表表项管理</h2>
      <p class="desc">报表定义 + 表项树（6 类报表：资产负债表/损益表/现金流/指标/风险/流动性）</p>
    </div>

    <!-- 上半：报表定义列表 -->
    <el-card class="filter-card">
      <el-row :gutter="16" type="flex" align="middle">
        <el-col :span="5">
          <el-select v-model="filter.reportType" placeholder="报表类型" clearable @change="loadReports">
            <el-option v-for="t in REPORT_TYPES" :label="t.label" :value="t.value" :key="t.value" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-select v-model="filter.schemeId" placeholder="账户册方案" clearable filterable @change="loadReports">
            <el-option v-for="s in schemes" :key="s.id"
                       :label="`${s.schemeCode} | ${s.schemeName}`" :value="s.id" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-input v-model="filter.keyword" placeholder="报表编码/名称" clearable @keyup.enter.native="loadReports" />
        </el-col>
        <el-col :span="8">
          <el-button icon="el-icon-search" @click="loadReports">查询</el-button>
          <el-button icon="el-icon-refresh-left" @click="onReset">重置</el-button>
          <el-button icon="el-icon-calculator" @click="openCalcModal">按月试算</el-button>
          <el-button type="danger" icon="el-icon-plus" @click="onAddReport">新增报表</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card" v-loading="loading">
      <el-table :data="reports" border stripe>
        <el-table-column prop="reportCode" label="报表编码" width="120" />
        <el-table-column prop="reportName" label="报表名称" />
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.reportType)" size="mini">{{ typeLabel(row.reportType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="schemeName" label="关联方案" width="180" />
        <el-table-column prop="itemCount" label="表项数" width="80" align="center" />
        <el-table-column label="操作" width="260" align="center">
          <template #default="{ row }">
            <el-button type="text" @click="viewItems(row)">📋 表项</el-button>
            <el-button type="text" @click="onEditReport(row)">编辑</el-button>
            <el-button type="text" style="color:#f56c6c;" @click="onDeleteReport(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑报表 -->
    <el-dialog :title="editingReport ? '编辑报表' : '新增报表'" :visible.sync="modalVisible" width="560px">
      <el-form :model="reportForm" :rules="reportRules" ref="reportFormRef" label-width="100px">
        <el-form-item label="报表编码" prop="reportCode"><el-input v-model="reportForm.reportCode" /></el-form-item>
        <el-form-item label="报表名称" prop="reportName"><el-input v-model="reportForm.reportName" /></el-form-item>
        <el-form-item label="报表类型" prop="reportType">
          <el-select v-model="reportForm.reportType" style="width:100%">
            <el-option v-for="t in REPORT_TYPES" :label="t.label" :value="t.value" :key="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="账户册方案" prop="schemeId">
          <el-select v-model="reportForm.schemeId" style="width:100%" filterable>
            <el-option v-for="s in schemes" :key="s.id"
                       :label="`${s.schemeCode} | ${s.schemeName}`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="reportForm.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="modalVisible=false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmitReport">提交</el-button>
      </template>
    </el-dialog>

    <!-- 表项树弹窗 -->
    <el-dialog :title="`表项管理 - ${currentReport?.reportName || ''}`"
               :visible.sync="itemsModalVisible" width="780px" top="5vh">
      <el-row :gutter="12">
        <el-col :span="16">
          <el-table :data="itemsTree" row-key="id" border default-expand-all
                    :tree-props="{ children: 'children' }" v-loading="itemsLoading" max-height="500">
            <el-table-column prop="itemCode" label="编码" width="120" />
            <el-table-column prop="itemName" label="名称" />
            <el-table-column prop="dataType" label="类型" width="80" align="center" />
            <el-table-column prop="formula" label="公式" show-overflow-tooltip />
            <el-table-column label="操作" width="160" align="center">
              <template #default="{ row }">
                <el-button type="text" size="mini" @click="onAddItemChild(row)">+ 子项</el-button>
                <el-button type="text" size="mini" @click="onEditItem(row)">编辑</el-button>
                <el-button type="text" size="mini" style="color:#f56c6c;" @click="onDeleteItem(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-col>
        <el-col :span="8">
          <el-card shadow="never" class="add-card">
            <div slot="header"><strong>新增表项</strong></div>
            <el-form :model="itemForm" label-width="80px" size="small">
              <el-form-item label="父表项">
                <el-cascader v-model="itemForm.parentPath"
                             :options="cascaderOpts" :props="{ checkStrictly:true, value:'id', label:'itemName' }"
                             clearable change-on-select placeholder="根节点" />
              </el-form-item>
              <el-form-item label="编码"><el-input v-model="itemForm.itemCode" /></el-form-item>
              <el-form-item label="名称"><el-input v-model="itemForm.itemName" /></el-form-item>
              <el-form-item label="数据类型">
                <el-select v-model="itemForm.dataType" style="width:100%">
                  <el-option label="DECIMAL" value="DECIMAL" />
                  <el-option label="PERCENT" value="PERCENT" />
                  <el-option label="INTEGER" value="INTEGER" />
                  <el-option label="TEXT" value="TEXT" />
                </el-select>
              </el-form-item>
              <el-form-item label="公式">
                <el-input v-model="itemForm.formula" type="textarea" :rows="2" placeholder="A+B-C" />
              </el-form-item>
              <el-form-item label="描述">
                <el-input v-model="itemForm.description" type="textarea" :rows="2" />
              </el-form-item>
              <el-button type="danger" icon="el-icon-plus" size="small" :loading="submitting"
                         style="width:100%" @click="onSubmitItem">新增到树</el-button>
            </el-form>
          </el-card>
        </el-col>
      </el-row>
    </el-dialog>

    <!-- 按月试算弹窗 -->
    <el-dialog title="按月试算（trial-calculate）"
               :visible.sync="calcModalVisible" width="780px" top="5vh" @closed="resetCalcResult">
      <el-form :model="calcForm" label-width="100px" size="small">
        <el-form-item label="数据日期" required>
          <el-date-picker v-model="calcForm.dataDate" type="date" value-format="yyyy-MM-dd"
                          placeholder="选择数据日期" style="width:100%" />
        </el-form-item>
        <el-form-item label="报表范围">
          <el-select v-model="calcForm.reportId" placeholder="全部报表" clearable style="width:100%">
            <el-option label="全部报表（所有 item）" :value="null" />
            <el-option v-for="r in reports" :key="r.id"
                       :label="`[${r.reportCode}] ${r.reportName}`" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类筛选">
          <el-select v-model="calcForm.category" placeholder="全部分类" clearable style="width:100%">
            <el-option label="财务类 FINANCIAL" value="FINANCIAL" />
            <el-option label="规模类 SCALE" value="SCALE" />
            <el-option label="价格类 PRICE" value="PRICE" />
            <el-option label="收入类 INCOME" value="INCOME" />
            <el-option label="风险类 RISK" value="RISK" />
            <el-option label="资本类 CAPITAL" value="CAPITAL" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-alert type="info" :closable="false" show-icon>
            <template #title>
              对所有有 <code>coa_node_ids</code> 的表项（item），按所选日期从 <code>prcp_data_basic.orig_m1</code> 聚合，写入 <code>prcp_rpt_value</code>（同 item_id+data_date 重复执行将覆盖）。
            </template>
          </el-alert>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="calcModalVisible=false">取消</el-button>
        <el-button type="primary" icon="el-icon-calculator" :loading="calcSubmitting" @click="onRunCalc">开始试算</el-button>
      </template>

      <!-- 试算结果 -->
      <div v-if="calcResult" class="calc-result">
        <el-divider>试算结果</el-divider>
        <el-row :gutter="12" class="calc-summary">
          <el-col :span="6"><el-card shadow="never" class="sum-card"><div class="lbl">参与表项</div><div class="val">{{ calcResult.count }}</div><div class="u">项</div></el-card></el-col>
          <el-col :span="6"><el-card shadow="never" class="sum-card"><div class="lbl">新建</div><div class="val" style="color:#67c23a">{{ calcResult.created }}</div><div class="u">条</div></el-card></el-col>
          <el-col :span="6"><el-card shadow="never" class="sum-card"><div class="lbl">覆盖</div><div class="val" style="color:#409eff">{{ calcResult.updated }}</div><div class="u">条</div></el-card></el-col>
          <el-col :span="6"><el-card shadow="never" class="sum-card"><div class="lbl">数据日期</div><div class="val" style="font-size:14px">{{ calcResult.data_date }}</div><div class="u">&nbsp;</div></el-card></el-col>
        </el-row>
        <el-table :data="calcResult.results" border size="small" max-height="380" v-loading="calcSubmitting">
          <el-table-column prop="item_code" label="编码" width="120" />
          <el-table-column prop="item_name" label="名称" />
          <el-table-column prop="category" label="分类" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.category" size="mini" :type="catTag(row.category)">{{ row.category }}</el-tag>
              <span v-else style="color:#bbb">-</span>
            </template>
          </el-table-column>
          <el-table-column label="匹配节点数" prop="matched" width="100" align="center" />
          <el-table-column label="计算结果" width="160" align="right">
            <template #default="{ row }">
              <span :style="{ color: row.value >= 0 ? '#25334B' : '#C9332B' }">{{ formatNum(row.value) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="动作" width="80" align="center">
            <template #default="{ row }">
              <el-tag size="mini" :type="row.action === 'created' ? 'success' : 'warning'">{{ row.action === 'created' ? '新建' : '更新' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { reportsApi } from '@/api/reports'
import { coaApi } from '@/api/coa'

/**
 * @file 报表表项管理
 * @desc 报表定义 + 表项树 + 按月试算。布局: 顶部筛选 (报表类型/方案/关键字) + 报表列表 + 新增/编辑报表弹窗 +
 *       表项树弹窗 (左表项树 + 右新增表单) + 按月试算弹窗 (按日期从 prcp_data_basic.orig_m1 聚合写入 prcp_rpt_value)。
 *       6 类报表: BALANCE/INCOME/CASHFLOW/INDICATOR/RISK/LIQUIDITY。
 *
 * @author zhanghh
 * @since 2026-10-09
 *
 * 关联 API:
 *   GET    /rpt?report_type=&scheme_id=&keyword=   - 报表列表
 *   POST   /rpt                                     - 新建报表
 *   PUT    /rpt/{id}                                - 更新报表
 *   DELETE /rpt/{id}                                - 删除报表
 *   GET    /rpt/{id}/item                           - 表项树
 *   POST   /rpt/{id}/item                           - 新增表项
 *   PUT    /rpt/item/{id}                           - 更新表项
 *   DELETE /rpt/item/{id}                           - 删除表项
 *   POST   /rpt/calc-by-month                       - 按月试算 (data_date + report_id + category)
 *
 * 关联组件: 无
 * 关联路由: /reports (group: 报表管理)
 */
export default {
  name: 'RptIndex',
  data() {
    return {
      REPORT_TYPES: [
        { value: 'BALANCE', label: '资产负债表' },
        { value: 'INCOME', label: '损益表' },
        { value: 'CASHFLOW', label: '现金流量表' },
        { value: 'INDICATOR', label: '指标表' },
        { value: 'RISK', label: '风险表' },
        { value: 'LIQUIDITY', label: '流动性表' }
      ],
      schemes: [],
      /** 顶部筛选 (报表类型/账户册方案/关键字) */
      filter: { reportType: null, schemeId: null, keyword: '' },
      reports: [],
      loading: false,

      modalVisible: false,
      editingReport: null,
      /** 报表编辑表单 */
      reportForm: { reportCode: '', reportName: '', reportType: 'BALANCE', schemeId: null, description: '' },
      reportRules: {
        reportCode: [{ required: true, message: '请输入编码' }],
        reportName: [{ required: true, message: '请输入名称' }]
      },
      submitting: false,

      itemsModalVisible: false,
      currentReport: null,
      itemsTree: [],
      itemsLoading: false,
      /** 表项新增表单 (parentPath 是 cascader 路径) */
      itemForm: { parentPath: [], itemCode: '', itemName: '', dataType: 'DECIMAL', formula: '', description: '' },

      // 按月试算
      calcModalVisible: false,
      calcSubmitting: false,
      calcForm: { dataDate: '2025-12-31', reportId: null, category: null },
      calcResult: null
    }
  },
  computed: {
    cascaderOpts() {
      const toOpt = n => ({ id: n.id, itemName: `${n.itemCode} ${n.itemName}`, children: (n.children || []).map(toOpt) })
      return this.itemsTree.map(toOpt)
    }
  },
  async mounted() {
    this.schemes = await coaApi.listSchemes()
    if (this.schemes.length) {
      this.filter.schemeId = this.schemes[0].id
      this.loadReports()
    }
  },
  methods: {
    /**
     * <p>报表类型 → 中文标签</p>
     *
     * @param {string} t 类型 (BALANCE/INCOME/...)
     * @returns {string} 中文标签
     */
    typeLabel(t) { return (this.REPORT_TYPES.find(x => x.value === t) || {}).label || t },
    /**
     * <p>报表类型 → Element UI tag 类型</p>
     *
     * @param {string} t 类型
     * @returns {string} tag 类型
     */
    typeTagType(t) {
      return { BALANCE: 'danger', INCOME: 'warning', CASHFLOW: 'success',
               INDICATOR: '', RISK: 'info', LIQUIDITY: '' }[t] || ''
    },
    /**
     * <p>按当前筛选条件加载报表列表</p>
     *
     * @returns {Promise<void>}
     */
    async loadReports() {
      this.loading = true
      try { this.reports = await reportsApi.list({ report_type: this.filter.reportType, scheme_id: this.filter.schemeId, keyword: this.filter.keyword }) }
      finally { this.loading = false }
    },
    /** 重置筛选条件 (保留方案) */
    onReset() { this.filter = { reportType: null, schemeId: this.filter.schemeId, keyword: '' }; this.loadReports() },
    /** 打开新增报表弹窗 (默认 schemeId 为当前筛选方案) */
    onAddReport() {
      this.editingReport = null
      this.reportForm = { reportCode: '', reportName: '', reportType: 'BALANCE', schemeId: this.filter.schemeId, description: '' }
      this.modalVisible = true
    },
    /**
     * <p>打开编辑报表弹窗, 用行数据回填</p>
     *
     * @param {Object} row 报表行
     * @returns {void}
     */
    onEditReport(row) {
      this.editingReport = row
      this.reportForm = { ...row }
      this.modalVisible = true
    },
    /** 提交报表弹窗 (新增或更新) */
    async onSubmitReport() {
      await this.$refs.reportFormRef.validate()
      this.submitting = true
      try {
        if (this.editingReport) await reportsApi.update(this.editingReport.id, this.reportForm)
        else await reportsApi.create(this.reportForm)
        this.$message.success('保存成功')
        this.modalVisible = false
        this.loadReports()
      } finally { this.submitting = false }
    },
    /**
     * <p>删除报表 (带 confirm)</p>
     *
     * @param {Object} row 报表行 (含 id/reportCode/reportName)
     * @returns {void}
     */
    onDeleteReport(row) {
      this.$confirm(`确认删除 [${row.reportCode}] ${row.reportName}？`, '提示', { type: 'warning' })
        .then(async () => { await reportsApi.delete(row.id); this.$message.success('删除成功'); this.loadReports() })
        .catch(() => {})
    },
    /**
     * <p>打开表项树弹窗 (左树 + 右新增表单)</p>
     *
     * @param {Object} row 报表行
     * @returns {Promise<void>}
     */
    async viewItems(row) {
      this.currentReport = row
      this.itemsModalVisible = true
      await this.loadItems()
    },
    /** 加载当前报表的表项树 */
    async loadItems() {
      this.itemsLoading = true
      try { this.itemsTree = await reportsApi.listItems(this.currentReport.id) }
      finally { this.itemsLoading = false }
    },
    /**
     * <p>打开新增子表项 (parentPath 预填)</p>
     *
     * @param {Object} parent 父表项行
     * @returns {void}
     */
    onAddItemChild(parent) {
      this.itemForm = { parentPath: [parent.id], itemCode: '', itemName: '', dataType: 'DECIMAL', formula: '', description: '' }
    },
    /**
     * <p>打开编辑表项名称弹窗 (用 $prompt 简单编辑 name)</p>
     *
     * @param {Object} row 表项行
     * @returns {void}
     */
    onEditItem(row) {
      this.$prompt(`修改 [${row.itemCode}] 名称：`, '编辑表项', { inputValue: row.itemName })
        .then(async ({ value }) => {
          await reportsApi.updateItem(row.id, { ...row, itemName: value })
          this.$message.success('已更新'); this.loadItems()
        }).catch(() => {})
    },
    /** 提交新增表项, parentId 从 parentPath 取最后一级 */
    async onSubmitItem() {
      if (!this.itemForm.itemCode || !this.itemForm.itemName) return this.$message.warning('请输入编码和名称')
      this.submitting = true
      try {
        await reportsApi.createItem({
          reportId: this.currentReport.id,
          itemCode: this.itemForm.itemCode,
          itemName: this.itemForm.itemName,
          dataType: this.itemForm.dataType,
          formula: this.itemForm.formula,
          description: this.itemForm.description,
          parentId: this.itemForm.parentPath.length ? this.itemForm.parentPath[this.itemForm.parentPath.length - 1] : null
        })
        this.$message.success('已新增')
        this.itemForm = { parentPath: [], itemCode: '', itemName: '', dataType: 'DECIMAL', formula: '', description: '' }
        await this.loadItems()
        // 刷新 item_count
        this.loadReports()
      } finally { this.submitting = false }
    },
    /**
     * <p>删除表项 (带 confirm)</p>
     *
     * @param {Object} row 表项行
     * @returns {void}
     */
    onDeleteItem(row) {
      this.$confirm(`确认删除 [${row.itemCode}] ${row.itemName}？`, '提示', { type: 'warning' })
        .then(async () => { await reportsApi.deleteItem(row.id); this.$message.success('已删除'); this.loadItems(); this.loadReports() })
        .catch(() => {})
    },

    // ========== 按月试算 ==========
    /** 打开按月试算弹窗 */
    openCalcModal() {
      this.calcModalVisible = true
    },
    /** 关闭试算弹窗时清空结果 */
    resetCalcResult() {
      this.calcResult = null
    },
    /**
     * <p>执行按月试算 — 按日期从 prcp_data_basic.orig_m1 聚合写入 prcp_rpt_value</p>
     *
     * @returns {Promise<void>}
     */
    async onRunCalc() {
      if (!this.calcForm.dataDate) return this.$message.warning('请选择数据日期')
      this.calcSubmitting = true
      this.calcResult = null
      try {
        this.calcResult = await reportsApi.calcByMonth({
          data_date: this.calcForm.dataDate,
          category: this.calcForm.category || null,
          report_id: this.calcForm.reportId || null
        })
        this.$message.success(`试算完成：参与 ${this.calcResult.count} 项，新建 ${this.calcResult.created} 条，更新 ${this.calcResult.updated} 条`)
      } catch (e) {
        this.$message.error('试算失败：' + (e?.message || e))
      } finally {
        this.calcSubmitting = false
      }
    },
    /**
     * <p>分类 → Element UI tag 类型</p>
     *
     * @param {string} c 分类 (FINANCIAL/SCALE/PRICE/INCOME/RISK/CAPITAL)
     * @returns {string} tag 类型
     */
    catTag(c) {
      return { FINANCIAL: 'danger', SCALE: '', PRICE: 'warning', INCOME: 'success', RISK: 'info', CAPITAL: '' }[c] || 'info'
    },
    /**
     * <p>数值格式化 (zh-CN 千分位, 最多 4 位小数)</p>
     *
     * @param {number|string} v 原始数值
     * @returns {string} 格式化字符串
     */
    formatNum(v) {
      if (v == null) return ''
      const n = Number(v)
      if (Number.isNaN(n)) return v
      return n.toLocaleString('zh-CN', { maximumFractionDigits: 4 })
    }
  }
}
</script>

<style scoped>
.rpt-page { padding: 0; }
.page-header { background:#fff; padding:16px 24px; margin-bottom:16px; border-bottom:1px solid #f0f0f0; }
.page-header h2 { margin:0; }
.page-header .desc { color:#999; font-size:13px; margin:4px 0 0; }
.filter-card { margin:0 16px 16px; }
.table-card { margin:0 16px 16px; }
.add-card { background:#F4F8FD; border:1px dashed #B6CEF6; }

/* 按月试算结果 */
.calc-result { margin-top:8px; }
.calc-summary .sum-card { background:#F4F8FD; border:1px solid #D9E5F7; text-align:center; padding:8px 0; }
.calc-summary .sum-card .lbl { color:#6C7D96; font-size:12px; }
.calc-summary .sum-card .val { font-size:22px; font-weight:600; color:#071B4D; margin:4px 0; }
.calc-summary .sum-card .u { color:#6C7D96; font-size:12px; }
</style>