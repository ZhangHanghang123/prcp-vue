<template>
  <div class="page-wrap">
    <el-card shadow="never" class="header-card">
      <div class="page-title">
        <i class="el-icon-data-line" style="color: var(--citic-red)"></i>
        <span>NSFR 参数补录</span>
        <el-tag size="small" type="info" effect="plain">计量参数补录</el-tag>
        <span class="sub">净稳定资金比例 NSFR = 可用稳定资金 ASF / 所需稳定资金 RSF</span>
      </div>
      <div class="page-actions">
        <el-button type="primary" icon="el-icon-plus" size="small" @click="onAdd">新增记录</el-button>
      </div>
    </el-card>

    <!-- KPI 统计 -->
    <el-row :gutter="12" class="kpi-row">
      <el-col :span="8">
        <el-card shadow="never" class="kpi-card">
          <div class="kpi-label">记录总数</div>
          <div class="kpi-value" style="color:#13c2c2">{{ stats.total }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="kpi-card">
          <div class="kpi-label">ASF 可用稳定资金节点数</div>
          <div class="kpi-value" style="color:#52c41a">{{ stats.numYes }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="kpi-card">
          <div class="kpi-label">RSF 所需稳定资金节点数</div>
          <div class="kpi-value" style="color:#fa8c16">{{ stats.denYes }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选条 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" size="small">
        <el-form-item label="账户册方案">
          <el-select v-model="filterSchemeId" placeholder="账户册方案" filterable clearable style="width:240px" @change="loadList">
            <el-option v-for="s in schemes" :key="s.id" :label="`${s.schemeCode} | ${s.schemeName}`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据日期">
          <el-date-picker v-model="filterDate" type="date" placeholder="数据日期" value-format="yyyy-MM-dd" style="width:160px" @change="loadList" />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="keyword" placeholder="搜索编码/名称/规则说明" clearable style="width:240px" @keyup.enter.native="loadList" @clear="loadList">
            <el-button slot="append" icon="el-icon-search" @click="loadList"></el-button>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button icon="el-icon-refresh-left" @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 规则说明 -->
    <el-alert
      title="ID 生成规则与 NSFR 字段说明"
      type="info"
      :closable="false"
      show-icon
      class="alert-card"
    >
      <template slot="default">
        每条记录 ID = <code>{scheme_code}_{node_code}_{YYYYMMDD}</code>，
        例如 <code>ZX_COA_S010102010101_20251231</code>。
        <strong>ASF</strong>（Available Stable Funding 可用稳定资金）：权益/MLF/对公/零售存款折算 35%~100%；
        <strong>RSF</strong>（Required Stable Funding 所需稳定资金）：贷款/同业/其他资产折算 0%~100%。
        修改方案/节点/数据日期会生成新记录。
      </template>
    </el-alert>

    <!-- 表格 -->
    <el-card shadow="never" class="mt-12">
      <el-table :data="records" border stripe v-loading="loading" :max-height="tableMaxHeight" size="small">
        <el-table-column prop="dataDate" label="数据日期" width="110" fixed="left">
          <template slot-scope="s">
            <el-tag size="mini" type="info" effect="plain">{{ s.row.dataDate }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="nodeCode" label="账户册编码" width="160" show-overflow-tooltip>
          <template slot-scope="s">
            <el-tag size="mini" type="info" effect="plain" style="font-family:monospace">{{ s.row.nodeCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="nodeName" label="账户册名称" width="200" show-overflow-tooltip />
        <el-table-column label="是否ASF" width="90" align="center">
          <template slot-scope="s">
            <el-tag v-if="s.row.isAsf" size="mini" type="success">是</el-tag>
            <el-tag v-else size="mini">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="ASF折算系数" width="140" align="right">
          <template slot-scope="s">
            <span v-if="Number(s.row.asfFactor) === 0" class="num-cell-zero">0.000000 <small style="color:#999;margin-left:4px">(贡献为0)</small></span>
            <span v-else class="num-cell">{{ Number(s.row.asfFactor).toFixed(6) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="ASF运算符" width="100" align="center">
          <template slot-scope="s">
            <el-tag size="mini" :type="s.row.asfOperator === '+' ? '' : 'warning'" effect="plain" style="font-family:monospace;font-weight:600">{{ opLabel(s.row.asfOperator) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="是否RSF" width="90" align="center">
          <template slot-scope="s">
            <el-tag v-if="s.row.isRsf" size="mini" type="success">是</el-tag>
            <el-tag v-else size="mini">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="RSF折算系数" width="140" align="right">
          <template slot-scope="s">
            <span v-if="Number(s.row.rsfFactor) === 0" class="num-cell-zero">0.000000 <small style="color:#999;margin-left:4px">(贡献为0)</small></span>
            <span v-else class="num-cell">{{ Number(s.row.rsfFactor).toFixed(6) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="RSF运算符" width="100" align="center">
          <template slot-scope="s">
            <el-tag size="mini" :type="s.row.rsfOperator === '+' ? '' : 'warning'" effect="plain" style="font-family:monospace;font-weight:600">{{ opLabel(s.row.rsfOperator) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ruleNote" label="规则说明" min-width="240" show-overflow-tooltip>
          <template slot-scope="s">
            <span style="color:#666">{{ s.row.ruleNote }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template slot-scope="s">
            <el-tag size="mini" :type="s.row.status === 'ACTIVE' ? 'success' : 'info'">{{ s.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right" align="center">
          <template slot-scope="s">
            <el-button type="text" size="mini" icon="el-icon-edit" @click="onEdit(s.row)">编辑</el-button>
            <el-button type="text" size="mini" style="color:#C9332B" icon="el-icon-delete" @click="onRemove(s.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog :title="dlg.id ? '编辑 NSFR 参数：' + dlg.nodeCode : '新增 NSFR 参数'" :visible.sync="dlg.show" width="720px" @close="onDlgClose">
      <el-form :model="dlg" :rules="rules" ref="dlgForm" label-width="110px" size="small">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="账户册方案" prop="schemeId">
              <el-select v-model="dlg.schemeId" placeholder="选择账户册方案" filterable style="width:100%" :disabled="!!dlg.id" @change="onSchemePick">
                <el-option v-for="s in schemes" :key="s.id" :label="`${s.schemeCode} | ${s.schemeName}`" :value="s.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据日期" prop="dataDate">
              <el-date-picker v-model="dlg.dataDate" type="date" placeholder="选择日期" value-format="yyyy-MM-dd" style="width:100%" :disabled="!!dlg.id" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="账户册节点" prop="nodeId">
          <el-select v-model="dlg.nodeId" placeholder="选择账户册节点" filterable style="width:100%" :disabled="!!dlg.id" @change="onNodePick">
            <el-option v-for="n in nodesOfScheme" :key="n.id" :label="`${n.nodeCode} | ${n.nodeName}`" :value="n.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="账户册编码">
              <el-input :value="dlg.nodeCode" disabled placeholder="选择节点后自动填充" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="账户册名称">
              <el-input :value="dlg.nodeName" disabled placeholder="选择节点后自动填充" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left"><span style="color:#52c41a;font-weight:600">ASF 参数（可用稳定资金）</span></el-divider>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="是否ASF">
              <el-switch v-model="dlg.isAsf" :active-value="1" :inactive-value="0" active-text="是" inactive-text="否" />
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="ASF折算系数" prop="asfFactor">
              <el-input-number v-model="dlg.asfFactor" :precision="6" :step="0.0001" :min="0" :max="1" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="ASF运算符" prop="asfOperator">
              <el-select v-model="dlg.asfOperator" placeholder="运算符" style="width:100%">
                <el-option v-for="o in operators" :key="o.dictKey" :label="o.dictLabel" :value="o.dictKey" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left"><span style="color:#fa8c16;font-weight:600">RSF 参数（所需稳定资金）</span></el-divider>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="是否RSF">
              <el-switch v-model="dlg.isRsf" :active-value="1" :inactive-value="0" active-text="是" inactive-text="否" />
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="RSF折算系数" prop="rsfFactor">
              <el-input-number v-model="dlg.rsfFactor" :precision="6" :step="0.0001" :min="0" :max="1" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="RSF运算符" prop="rsfOperator">
              <el-select v-model="dlg.rsfOperator" placeholder="运算符" style="width:100%">
                <el-option v-for="o in operators" :key="o.dictKey" :label="o.dictLabel" :value="o.dictKey" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">其他</el-divider>
        <el-form-item label="NSFR 规则说明">
          <el-input v-model="dlg.ruleNote" type="textarea" :rows="2" placeholder="如：对公一般贷款 流入 100%" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="dlg.status" style="width:200px">
            <el-option label="ACTIVE 启用" value="ACTIVE" />
            <el-option label="INACTIVE 停用" value="INACTIVE" />
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dlg.show=false">取消</el-button>
        <el-button type="primary" :loading="saveLoading" @click="onSave">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import request from '@/api/request'

/**
 * @file NSFR 参数补录
 * @desc 监管指标 NSFR (Net Stable Funding Ratio 净稳定资金比例) 的参数补录页面。
 *       NSFR = 可用稳定资金 ASF / 所需稳定资金 RSF。
 *       布局: 头部 + 3-stat 行(记录总数/ASF 节点/RSF 节点) + 筛选条(方案/日期/关键词) + 规则说明 alert + 表格 + 增改删弹窗。
 *       每条记录 ID = {scheme_code}_{node_code}_{YYYYMMDD}，修改方案/节点/数据日期会生成新记录。
 *       默认方案 ZX_COA (演示数据所在方案)，默认数据日期 2025-12-31。
 *
 * @author zhanghh
 * @since 2026-10-09
 *
 * 关联 API:
 *   GET    /nsfr-param         - 列表
 *   GET    /nsfr-param/options - 下拉选项(方案/节点/运算符/日期)
 *   POST   /nsfr-param         - 新增
 *   PUT    /nsfr-param/{id}    - 更新
 *   DELETE /nsfr-param/{id}    - 删除
 *
 * 关联组件: 无
 * 关联路由: /nsfr-param (group: 计量参数补录)
 */
export default {
  data() {
    return {
      loading: false,
      saveLoading: false,
      records: [],
      schemes: [],
      nodes: [],
      operators: [],
      dataDates: [],

      /** 当前过滤选中的方案 ID (默认 null → 选项加载后默认 ZX_COA) */
      filterSchemeId: null,
      /** 当前过滤选中的数据日期 (默认 '2025-12-31') */
      filterDate: '2025-12-31',
      /** 关键字过滤 (编码/名称/规则说明) */
      keyword: '',

      /** 编辑弹窗的表单数据 */
      dlg: this.initDlg(),

      rules: {
        schemeId: [{ required: true, message: '请选择账户册方案', trigger: 'change' }],
        nodeId: [{ required: true, message: '请选择账户册节点', trigger: 'change' }],
        dataDate: [{ required: true, message: '请选择数据日期', trigger: 'change' }],
        asfFactor: [{ required: true, message: '请输入ASF折算系数', trigger: 'blur' }],
        rsfFactor: [{ required: true, message: '请输入RSF折算系数', trigger: 'blur' }],
        asfOperator: [{ required: true, message: '请选择ASF运算符', trigger: 'change' }],
        rsfOperator: [{ required: true, message: '请选择RSF运算符', trigger: 'change' }],
        status: [{ required: true, message: '请选择状态', trigger: 'change' }]
      }
    }
  },
  computed: {
    tableMaxHeight() { return window.innerHeight - 360 },
    nodesOfScheme() {
      return this.filterSchemeId
        ? this.nodes.filter(n => Number(n.scheme_id) === Number(this.filterSchemeId))
        : this.nodes
    },
    stats() {
      return {
        total: this.records.length,
        numYes: this.records.filter(r => r.isAsf).length,
        denYes: this.records.filter(r => r.isRsf).length
      }
    }
  },
  watch: {
    filterSchemeId() { this.loadList() },
    filterDate() { this.loadList() }
  },
  async mounted() {
    await this.loadOptions()
  },
  methods: {
    /** 返回新增/编辑对话框的默认值 (空表单) */
    initDlg() {
      return {
        show: false,
        id: null,
        schemeId: null,
        nodeId: null,
        nodeCode: '',
        nodeName: '',
        dataDate: '',
        isAsf: 0,
        asfFactor: 0,
        asfOperator: '+',
        isRsf: 0,
        rsfFactor: 0,
        rsfOperator: '+',
        ruleNote: '',
        status: 'ACTIVE'
      }
    },
    /**
     * <p>运算符 key 转 dictLabel</p>
     *
     * @param {string} key 运算符字典 key
     * @returns {string} 显示名
     */
    opLabel(key) {
      const o = this.operators.find(x => x.dictKey === key)
      return o ? o.dictLabel : (key || '-')
    },
    /**
     * <p>加载下拉选项 (方案/节点/运算符/日期), 默认 ZX_COA, 加载后立即触发 loadList</p>
     *
     * @returns {Promise<void>}
     */
    async loadOptions() {
      try {
        const opt = await request.get('/nsfr-param/options')
        this.schemes = opt.schemes || []
        this.nodes = opt.nodes || []
        this.operators = opt.operators || []
        this.dataDates = opt.data_dates || []
        // 默认选 ZX_COA 方案
        if (!this.filterSchemeId) {
          const zxcoa = this.schemes.find(s => s.schemeCode === 'ZX_COA')
          this.filterSchemeId = zxcoa ? zxcoa.id : (this.schemes[0] ? this.schemes[0].id : null)
        }
        this.loadList()
      } catch (e) {
        this.$message.error('选项加载失败')
      }
    },
    /**
     * <p>按 filterSchemeId/filterDate/keyword 当前条件加载列表</p>
     *
     * @returns {Promise<void>}
     */
    async loadList() {
      this.loading = true
      try {
        const params = {}
        if (this.filterSchemeId) params.schemeId = this.filterSchemeId
        if (this.filterDate) params.dataDate = this.filterDate
        if (this.keyword && this.keyword.trim()) params.keyword = this.keyword.trim()
        const items = await request.get('/nsfr-param', { params })
        this.records = (items && items.items) || (Array.isArray(items) ? items : [])
      } catch (e) {
        this.$message.error('列表加载失败')
      } finally {
        this.loading = false
      }
    },
    /** 重置筛选条件为默认 (ZX_COA + 2025-12-31 + 空关键字) */
    onReset() {
      const zxcoa = this.schemes.find(s => s.schemeCode === 'ZX_COA')
      this.filterSchemeId = zxcoa ? zxcoa.id : (this.schemes[0] ? this.schemes[0].id : null)
      this.filterDate = '2025-12-31'
      this.keyword = ''
      this.loadList()
    },
    /**
     * <p>对话框方案切换: 同步 schemeCode 并清空节点选择</p>
     *
     * @param {number} v 选中的方案 ID
     * @returns {void}
     */
    onSchemePick(v) {
      const sch = this.schemes.find(s => s.id === v)
      if (sch) this.dlg.schemeCode = sch.schemeCode
      // 切换方案时清空节点选择
      this.dlg.nodeId = null
      this.dlg.nodeCode = ''
      this.dlg.nodeName = ''
    },
    /** 节点选择后自动回填编码/名称 */
    onNodePick(v) {
      const nd = this.nodesOfScheme.find(n => n.id === v)
      if (nd) {
        this.dlg.nodeCode = nd.nodeCode
        this.dlg.nodeName = nd.nodeName
      }
    },
    /** 打开新增弹窗 (复用筛选条件预填方案/日期) */
    onAdd() {
      this.dlg = this.initDlg()
      this.dlg.show = true
      if (this.filterSchemeId) {
        this.dlg.schemeId = this.filterSchemeId
        const sch = this.schemes.find(s => s.id === this.filterSchemeId)
        if (sch) this.dlg.schemeCode = sch.schemeCode
      }
      this.dlg.dataDate = this.filterDate || '2025-12-31'
      this.$nextTick(() => { if (this.$refs.dlgForm) this.$refs.dlgForm.clearValidate() })
    },
    /**
     * <p>打开编辑弹窗, 用行数据回填表单</p>
     *
     * @param {Object} row 表格行 (含 id/schemeId/nodeId/asfFactor/rsfFactor 等字段)
     * @returns {void}
     */
    onEdit(row) {
      this.dlg = {
        show: true,
        id: row.id,
        schemeId: row.schemeId,
        nodeId: row.nodeId,
        nodeCode: row.nodeCode,
        nodeName: row.nodeName,
        dataDate: row.dataDate,
        isAsf: row.isAsf,
        asfFactor: Number(row.asfFactor),
        asfOperator: row.asfOperator,
        isRsf: row.isRsf,
        rsfFactor: Number(row.rsfFactor),
        rsfOperator: row.rsfOperator,
        ruleNote: row.ruleNote || '',
        status: row.status
      }
      this.$nextTick(() => { if (this.$refs.dlgForm) this.$refs.dlgForm.clearValidate() })
    },
    /** 对话框关闭清理 */
    onDlgClose() {
      this.dlg = this.initDlg()
    },
    /**
     * <p>保存弹窗 (新增或更新), 带表单校验</p>
     *
     * @returns {Promise<void>}
     */
    async onSave() {
      try {
        await this.$refs.dlgForm.validate()
      } catch (e) {
        return
      }
      this.saveLoading = true
      try {
        const body = {
          schemeId: this.dlg.schemeId,
          schemeCode: this.schemes.find(s => s.id === this.dlg.schemeId)?.schemeCode,
          nodeId: this.dlg.nodeId,
          nodeCode: this.dlg.nodeCode,
          nodeName: this.dlg.nodeName,
          dataDate: this.dlg.dataDate,
          isAsf: this.dlg.isAsf ? 1 : 0,
          asfFactor: Number(this.dlg.asfFactor || 0),
          asfOperator: this.dlg.asfOperator,
          isRsf: this.dlg.isRsf ? 1 : 0,
          rsfFactor: Number(this.dlg.rsfFactor || 0),
          rsfOperator: this.dlg.rsfOperator,
          ruleNote: this.dlg.ruleNote,
          status: this.dlg.status
        }
        if (this.dlg.id) {
          await request.put(`/nsfr-param/${this.dlg.id}`, body)
          this.$message.success('已更新')
        } else {
          await request.post('/nsfr-param', body)
          this.$message.success('已新增')
        }
        this.dlg.show = false
        this.loadList()
      } catch (e) {
        this.$message.error((e && e.message) || '保存失败')
      } finally {
        this.saveLoading = false
      }
    },
    /**
     * <p>删除一条记录 (带 confirm 二次确认)</p>
     *
     * @param {Object} row 表格行 (含 id 字段)
     * @returns {Promise<void>}
     */
    async onRemove(row) {
      try {
        await this.$confirm('确认删除该条 NSFR 记录？', '提示', { type: 'warning' })
        await request.delete(`/nsfr-param/${row.id}`)
        this.$message.success('已删除')
        this.loadList()
      } catch (e) {
        if (e === 'cancel') return
        this.$message.error((e && e.message) || '删除失败')
      }
    }
  }
}
</script>

<style scoped>
.page-wrap { padding: 16px; }
.header-card {
  border-top: 3px solid var(--citic-red);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-title { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 600; }
.page-title .sub { font-size: 12px; color: #999; font-weight: normal; margin-left: 8px; }
.kpi-row { margin-top: 12px; }
.kpi-card { text-align: center; }
.kpi-label { font-size: 13px; color: #666; margin-bottom: 6px; }
.kpi-value { font-size: 26px; font-weight: 600; }
.filter-card { margin-top: 12px; }
.alert-card { margin-top: 12px; }
.mt-12 { margin-top: 12px; }
.num-cell { font-family: 'Roboto Mono', Consolas, monospace; font-weight: 600; color: var(--citic-red); }
.num-cell-zero { font-family: 'Roboto Mono', Consolas, monospace; color: #bfbfbf; }
</style>