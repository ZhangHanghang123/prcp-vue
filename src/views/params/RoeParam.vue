<template>
  <div class="roe-page">
    <!-- 页面头 -->
    <el-card shadow="never" class="header-card">
      <div class="page-title">
        <i class="el-icon-data-analysis" style="color: var(--citic-red)"></i>
        <span>ROE 参数补录</span>
        <el-tag size="small" type="success" effect="plain" style="margin-left:8px">计量参数补录</el-tag>
        <span class="sub">账户册 × 净利润 / 净资产 × 折算系数 + 运算符</span>
      </div>
    </el-card>

    <!-- KPI 统计 -->
    <el-row :gutter="12" style="margin-top:12px">
      <el-col :span="8">
        <el-card shadow="never" class="kpi-card" :body-style="{padding:'12px 16px'}">
          <div class="kpi-label"><i class="el-icon-document"></i> 记录总数</div>
          <div class="kpi-value" style="color:#13c2c2">{{ stats.total }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="kpi-card" :body-style="{padding:'12px 16px'}">
          <div class="kpi-label"><i class="el-icon-trophy"></i> 净利润节点数</div>
          <div class="kpi-value" style="color:#52c41a">{{ stats.numYes }} <span class="kpi-unit">个</span></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="kpi-card" :body-style="{padding:'12px 16px'}">
          <div class="kpi-label"><i class="el-icon-bank-card"></i> 净资产节点数</div>
          <div class="kpi-value" style="color:#fa8c16">{{ stats.denYes }} <span class="kpi-unit">个</span></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选条 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" size="small" @submit.native.prevent>
        <el-form-item label="账户册方案">
          <el-select v-model="flt.schemeId" placeholder="选择账户册方案" filterable clearable style="width:240px" @change="onSchemeChange">
            <el-option v-for="s in schemes" :key="s.id" :label="`${s.schemeCode} | ${s.schemeName}`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据日期">
          <el-date-picker v-model="flt.dataDate" type="date" value-format="yyyy-MM-dd" placeholder="选择数据日期" style="width:160px" @change="loadList" />
        </el-form-item>
        <el-form-item label="关键字">
          <el-input v-model="flt.keyword" placeholder="节点编码 / 名称 / 规则说明" clearable style="width:240px" @keyup.enter.native="loadList" />
        </el-form-item>
        <el-form-item>
          <el-button icon="el-icon-search" type="primary" @click="loadList">查询</el-button>
          <el-button icon="el-icon-refresh-left" @click="onReset">重置</el-button>
          <el-button icon="el-icon-plus" type="success" @click="openDlg()">新增记录</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- ID 规则说明 -->
    <el-alert
      title="ID 生成规则与字段说明"
      type="info"
      :closable="false"
      show-icon
      style="margin-top:12px"
      description="每条记录 ID = {scheme_code}_{node_code}_{YYYYMMDD}，例如 ZX_COA_S010102010101_20251231。ROE = 净利润 / 平均净资产。净利润折算系数（如营业收入、中收等）和净资产折算系数（如实收资本、未分配利润等）。修改方案/节点/数据日期会生成新记录。"
    />

    <!-- 表格 -->
    <el-card shadow="never" class="mt-12">
      <el-table :data="rows" border stripe v-loading="loading" size="small" :height="600" style="width:100%">
        <el-table-column prop="dataDate" label="数据日期" width="110" fixed="left">
          <template slot-scope="s">
            <el-tag size="mini" effect="plain" type="info">{{ s.row.dataDate }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="nodeCode" label="账户册编码" width="170">
          <template slot-scope="s">
            <el-tooltip :content="`${s.row.nodeCode} · ${s.row.nodeName || ''}`" placement="top">
              <el-tag size="mini" effect="dark" type="info" style="font-family:Consolas,monospace">{{ s.row.nodeCode }}</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="nodeName" label="账户册名称" min-width="220" show-overflow-tooltip />
        <el-table-column label="是否净利润" width="90" align="center">
          <template slot-scope="s">
            <el-tag v-if="Number(s.row.isNetProfit) === 1" size="mini" type="success">是</el-tag>
            <el-tag v-else size="mini" type="info">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="净利润符号" width="100" align="center">
          <template slot-scope="s">
            <el-tag :type="s.row.netProfitSymbol === '+' ? 'primary' : 'warning'" size="mini" style="font-family:Consolas,monospace;font-weight:600">{{ getOperatorLabel(s.row.netProfitSymbol) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="净利润折算系数" min-width="150" align="right">
          <template slot-scope="s">
            <span v-if="Number(s.row.netProfitFactor) === 0" class="num-zero">0.000000<small style="margin-left:4px;color:#999">(贡献为0)</small></span>
            <span v-else class="num-strong">{{ Number(s.row.netProfitFactor).toFixed(6) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="是否净资产" width="90" align="center">
          <template slot-scope="s">
            <el-tag v-if="Number(s.row.isNetAsset) === 1" size="mini" type="success">是</el-tag>
            <el-tag v-else size="mini" type="info">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="净资产符号" width="100" align="center">
          <template slot-scope="s">
            <el-tag :type="s.row.netAssetSymbol === '+' ? 'primary' : 'warning'" size="mini" style="font-family:Consolas,monospace;font-weight:600">{{ getOperatorLabel(s.row.netAssetSymbol) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="净资产折算系数" min-width="150" align="right">
          <template slot-scope="s">
            <span v-if="Number(s.row.netAssetFactor) === 0" class="num-zero">0.000000<small style="margin-left:4px;color:#999">(贡献为0)</small></span>
            <span v-else class="num-strong">{{ Number(s.row.netAssetFactor).toFixed(6) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="ruleNote" label="规则说明" min-width="240" show-overflow-tooltip />
        <el-table-column label="状态" width="80" align="center">
          <template slot-scope="s">
            <el-tag :type="s.row.status === 'ACTIVE' ? 'success' : 'info'" size="mini">{{ s.row.status === 'ACTIVE' ? '启用' : s.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right" align="center">
          <template slot-scope="s">
            <el-button type="text" size="mini" icon="el-icon-edit" @click="openDlg(s.row)">编辑</el-button>
            <el-button type="text" size="mini" icon="el-icon-delete" style="color:#C9332B" @click="onDelete(s.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog :title="dlg.id ? `编辑 ROE 参数：${dlg.nodeCode}` : '新增 ROE 参数'" :visible.sync="dlg.show" width="720px" @closed="onDlgClosed">
      <el-form :model="dlg" :rules="dlgRules" ref="dlgForm" label-width="120px" size="small">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="账户册方案" prop="schemeId">
              <el-select v-model="dlg.schemeId" placeholder="选择账户册方案" style="width:100%" :disabled="!!dlg.id" @change="onDlgSchemeChange">
                <el-option v-for="s in schemes" :key="s.id" :label="`${s.schemeCode} | ${s.schemeName}`" :value="s.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据日期" prop="dataDate">
              <el-date-picker v-model="dlg.dataDate" type="date" value-format="yyyy-MM-dd" placeholder="选择数据日期" style="width:100%" :disabled="!!dlg.id" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="账户册节点" prop="nodeId">
          <el-select v-model="dlg.nodeId" placeholder="选择账户册节点" filterable style="width:100%" :disabled="!!dlg.id" @change="onDlgNodeChange">
            <el-option v-for="n in nodesOfDlgScheme" :key="n.id" :label="`${n.nodeCode} | ${n.nodeName}`" :value="n.id" />
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

        <el-divider content-position="left">净利润（分子）</el-divider>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="是否净利润">
              <el-switch v-model="dlg.isNetProfit" active-color="#13c2c2" />
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="净利润符号">
              <el-select v-model="dlg.netProfitSymbol" placeholder="选择符号" style="width:100%">
                <el-option v-for="o in operators" :key="o.dictKey" :label="o.dictLabel" :value="o.dictKey" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="净利润折算系数">
              <el-input-number v-model="dlg.netProfitFactor" :precision="6" :step="0.0001" :min="0" :max="1" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">净资产（分母）</el-divider>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="是否净资产">
              <el-switch v-model="dlg.isNetAsset" active-color="#13c2c2" />
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="净资产符号">
              <el-select v-model="dlg.netAssetSymbol" placeholder="选择符号" style="width:100%">
                <el-option v-for="o in operators" :key="o.dictKey" :label="o.dictLabel" :value="o.dictKey" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="净资产折算系数">
              <el-input-number v-model="dlg.netAssetFactor" :precision="6" :step="0.0001" :min="0" :max="1" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">其他</el-divider>
        <el-form-item label="ROE 规则说明">
          <el-input v-model="dlg.ruleNote" type="textarea" :rows="2" placeholder="如：对公一般贷款 流入 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="dlg.status" placeholder="选择状态" style="width:200px">
            <el-option label="ACTIVE 启用" value="ACTIVE" />
            <el-option label="INACTIVE 停用" value="INACTIVE" />
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dlg.show = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSave">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import request from '@/api/request'

const DEFAULT_DATE = '2025-12-31'

function emptyDialog() {
  return {
    show: false,
    id: null,
    schemeId: null,
    schemeCode: '',
    dataDate: '',
    nodeId: null,
    nodeCode: '',
    nodeName: '',
    isNetProfit: false,
    netProfitSymbol: '+',
    netProfitFactor: 0,
    isNetAsset: false,
    netAssetSymbol: '+',
    netAssetFactor: 0,
    ruleNote: '',
    status: 'ACTIVE'
  }
}

export default {
  name: 'RoeParam',
  data() {
    return {
      loading: false,
      submitting: false,
      schemes: [],
      nodes: [],
      operators: [],
      rows: [],
      flt: { schemeId: null, dataDate: DEFAULT_DATE, keyword: '' },
      dlg: emptyDialog(),
      dlgRules: {
        schemeId: [{ required: true, message: '请选择账户册方案', trigger: 'change' }],
        dataDate: [{ required: true, message: '请选择数据日期', trigger: 'change' }],
        nodeId: [{ required: true, message: '请选择账户册节点', trigger: 'change' }]
      }
    }
  },
  computed: {
    /** 顶部筛选条按方案筛选节点 */
    nodesOfScheme() {
      return this.flt.schemeId ? this.nodes.filter(n => Number(n.schemeId) === Number(this.flt.schemeId)) : this.nodes
    },
    /** 对话框按方案筛选节点 */
    nodesOfDlgScheme() {
      return this.dlg.schemeId ? this.nodes.filter(n => Number(n.schemeId) === Number(this.dlg.schemeId)) : this.nodes
    },
    stats() {
      return {
        total: this.rows.length,
        numYes: this.rows.filter(r => Number(r.isNetProfit) === 1).length,
        denYes: this.rows.filter(r => Number(r.isNetAsset) === 1).length
      }
    }
  },
  watch: {
    'flt.schemeId'() { this.loadList() },
    'flt.dataDate'() { this.loadList() }
  },
  async mounted() {
    await this.loadOptions()
    this.loadList()
  },
  methods: {
    // ----- API 包装（独立、无 router/menu 依赖） -----
    listApi(params) { return request.get('/roe-param', { params }) },
    optionsApi() { return request.get('/roe-param/options') },
    createApi(body) { return request.post('/roe-param', body) },
    updateApi(id, body) { return request.put('/roe-param/' + id, body) },
    deleteApi(id) { return request.delete('/roe-param/' + id) },

    // ----- 选项 -----
    async loadOptions() {
      try {
        const opt = await this.optionsApi()
        this.schemes = opt.schemes || []
        this.nodes = opt.nodes || []
        this.operators = opt.operators || []
        // 默认选 ZX_COA（演示数据所在方案），其次第一个
        if (!this.flt.schemeId && this.schemes.length) {
          const zx = this.schemes.find(s => s.schemeCode === 'ZX_COA')
          this.flt.schemeId = zx ? zx.id : this.schemes[0].id
        }
      } catch (e) {
        this.$message.error('选项加载失败：' + (e.message || ''))
      }
    },

    // ----- 列表 -----
    async loadList() {
      this.loading = true
      try {
        const params = {}
        if (this.flt.schemeId) params.schemeId = this.flt.schemeId
        if (this.flt.dataDate) params.dataDate = this.flt.dataDate
        if (this.flt.keyword) params.keyword = this.flt.keyword
        const res = await this.listApi(params)
        this.rows = (res && res.items) || []
      } catch (e) {
        this.$message.error('列表加载失败：' + (e.message || ''))
      } finally {
        this.loading = false
      }
    },
    onSchemeChange() { this.loadList() },
    onReset() {
      const zx = this.schemes.find(s => s.schemeCode === 'ZX_COA')
      this.flt = {
        schemeId: zx ? zx.id : (this.schemes[0] ? this.schemes[0].id : null),
        dataDate: DEFAULT_DATE,
        keyword: ''
      }
    },

    // ----- 运算符显示 -----
    getOperatorLabel(key) {
      if (!key) return ''
      const op = this.operators.find(o => o.dictKey === key)
      return op ? op.dictLabel : key
    },

    // ----- 新增 / 编辑 -----
    openDlg(row) {
      if (row) {
        this.dlg = {
          show: true,
          id: row.id,
          schemeId: row.schemeId,
          schemeCode: row.schemeCode,
          dataDate: row.dataDate,
          nodeId: row.nodeId,
          nodeCode: row.nodeCode,
          nodeName: row.nodeName,
          isNetProfit: Number(row.isNetProfit) === 1,
          netProfitSymbol: row.netProfitSymbol || '+',
          netProfitFactor: Number(row.netProfitFactor) || 0,
          isNetAsset: Number(row.isNetAsset) === 1,
          netAssetSymbol: row.netAssetSymbol || '+',
          netAssetFactor: Number(row.netAssetFactor) || 0,
          ruleNote: row.ruleNote || '',
          status: row.status || 'ACTIVE'
        }
      } else {
        this.dlg = emptyDialog()
        this.dlg.show = true
        // 用筛选条件预填
        if (this.flt.schemeId) {
          this.dlg.schemeId = this.flt.schemeId
          const sch = this.schemes.find(s => s.id === this.flt.schemeId)
          this.dlg.schemeCode = sch ? sch.schemeCode : ''
        }
        this.dlg.dataDate = this.flt.dataDate || DEFAULT_DATE
      }
    },
    onDlgSchemeChange(v) {
      const sch = this.schemes.find(s => s.id === v)
      if (sch) this.dlg.schemeCode = sch.schemeCode
      // 切换方案时清掉已选节点
      this.dlg.nodeId = null
      this.dlg.nodeCode = ''
      this.dlg.nodeName = ''
    },
    onDlgNodeChange(v) {
      const nd = this.nodesOfDlgScheme.find(n => n.id === v)
      if (nd) {
        this.dlg.nodeCode = nd.nodeCode
        this.dlg.nodeName = nd.nodeName
      }
    },
    onDlgClosed() {
      this.dlg = emptyDialog()
      if (this.$refs.dlgForm) this.$refs.dlgForm.clearValidate()
    },
    async onSave() {
      try {
        await this.$refs.dlgForm.validate()
      } catch (e) { return }
      this.submitting = true
      try {
        const body = {
          schemeId: this.dlg.schemeId,
          schemeCode: this.dlg.schemeCode,
          nodeId: this.dlg.nodeId,
          nodeCode: this.dlg.nodeCode,
          nodeName: this.dlg.nodeName,
          dataDate: this.dlg.dataDate,
          isNetProfit: this.dlg.isNetProfit ? 1 : 0,
          netProfitSymbol: this.dlg.netProfitSymbol,
          netProfitFactor: Number(this.dlg.netProfitFactor) || 0,
          isNetAsset: this.dlg.isNetAsset ? 1 : 0,
          netAssetSymbol: this.dlg.netAssetSymbol,
          netAssetFactor: Number(this.dlg.netAssetFactor) || 0,
          ruleNote: this.dlg.ruleNote,
          status: this.dlg.status
        }
        if (this.dlg.id) {
          await this.updateApi(this.dlg.id, body)
          this.$message.success('已更新')
        } else {
          await this.createApi(body)
          this.$message.success('已新增')
        }
        this.dlg.show = false
        this.loadList()
      } catch (e) {
        this.$message.error('保存失败：' + (e.message || ''))
      } finally {
        this.submitting = false
      }
    },

    // ----- 删除 -----
    async onDelete(row) {
      try {
        await this.$confirm(`确定删除 ROE 参数记录「${row.nodeCode} · ${row.dataDate}」？`, '提示', { type: 'warning' })
      } catch (e) { return }
      try {
        await this.deleteApi(row.id)
        this.$message.success('已删除')
        this.loadList()
      } catch (e) {
        this.$message.error('删除失败：' + (e.message || ''))
      }
    }
  }
}
</script>

<style scoped>
.roe-page { padding: 16px; }
.header-card { border-top: 3px solid var(--citic-red); }
.page-title { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 600; }
.page-title .sub { font-size: 12px; color: #999; font-weight: normal; margin-left: 8px; }
.filter-card { margin-top: 12px; }
.mt-12 { margin-top: 12px; }
.kpi-card { border-left: 3px solid var(--citic-red); }
.kpi-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.kpi-value { font-size: 24px; font-weight: 700; line-height: 1.2; }
.kpi-unit { font-size: 12px; color: #999; font-weight: normal; margin-left: 4px; }
.num-strong { font-family: 'Roboto Mono', Consolas, monospace; font-weight: 600; }
.num-zero { font-family: 'Roboto Mono', Consolas, monospace; color: #bfbfbf; }
</style>