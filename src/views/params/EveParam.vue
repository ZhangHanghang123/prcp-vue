<template>
  <div class="page-wrap">
    <!-- 标题卡片 -->
    <el-card shadow="never" class="header-card">
      <div class="page-title">
        <i class="el-icon-data-line" style="color: var(--citic-red)"></i>
        <span>EVE 参数补录</span>
        <el-tag size="small" type="success" effect="dark">计量参数补录</el-tag>
        <span class="sub">账户册 × 节点 × 数据日期 × 资产/负债/久期（IRRBB 经济价值变动）</span>
      </div>
      <div class="header-extra">
        <el-button type="primary" icon="el-icon-plus" @click="onAdd">新增记录</el-button>
      </div>
    </el-card>

    <!-- 统计 KPI -->
    <el-card shadow="never" class="kpi-card">
      <el-row :gutter="16">
        <el-col :span="8">
          <div class="kpi-cell">
            <div class="kpi-label">记录总数</div>
            <div class="kpi-value" style="color: var(--citic-red)">{{ stats.total }}</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="kpi-cell">
            <div class="kpi-label">资产端节点数</div>
            <div class="kpi-value" style="color: #52c41a">{{ stats.numYes }} 个</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="kpi-cell">
            <div class="kpi-label">负债端节点数</div>
            <div class="kpi-value" style="color: #fa8c16">{{ stats.denYes }} 个</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 筛选 -->
    <el-card shadow="never" class="filter-card">
      <el-row :gutter="12" type="flex" align="middle">
        <el-col :span="5">
          <el-select v-model="flt.schemeId" placeholder="选择账户册方案（默认 ZX_COA）" filterable clearable style="width:100%" @change="loadList">
            <el-option v-for="s in schemes" :key="s.id" :label="`${s.schemeCode} | ${s.schemeName}`" :value="s.id" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-date-picker v-model="flt.dataDate" type="date" placeholder="数据日期（默认 2025-12-31）" value-format="yyyy-MM-dd" style="width:100%" @change="loadList" />
        </el-col>
        <el-col :span="7">
          <el-input v-model="flt.keyword" placeholder="搜索账户册编码 / 名称 / 规则说明" clearable @keyup.enter.native="loadList" @clear="loadList">
            <el-button slot="append" icon="el-icon-search" @click="loadList">搜索</el-button>
          </el-input>
        </el-col>
        <el-col :span="7">
          <el-button icon="el-icon-refresh-left" @click="onReset">重置</el-button>
          <el-button icon="el-icon-refresh" @click="loadList">刷新</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 说明 -->
    <el-alert
      title="ID 生成规则与字段说明"
      type="info"
      :closable="false"
      show-icon
      class="alert-card"
    >
      <template slot="description">
        每条记录 ID = <code>{scheme_code}_{node_code}_{YYYYMMDD}</code>，
        例如 <code>ZX_COA_S010102010101_20251231</code>。
        <strong>EVE 说明</strong>：经济价值变动（IRRBB），
        <span style="color:#C9332B">资产端</span>：含项目类型（贷款/债券/同业/...）和久期，用于加权久期计算；
        <span style="color:#C9332B">负债端</span>：含项目类型，用于加权久期计算。
        修改方案/节点/数据日期会生成新记录。
      </template>
    </el-alert>

    <!-- 表格 -->
    <el-card shadow="never" class="mt-12">
      <el-table :data="rows" border stripe v-loading="loading" :height="600" row-key="id">
        <el-table-column prop="dataDate" label="数据日期" width="110" fixed="left">
          <template slot-scope="s">
            <el-tag type="cyan" effect="plain" size="small">{{ s.row.dataDate }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="nodeCode" label="账户册编码" width="160" fixed="left">
          <template slot-scope="s">
            <el-tooltip :content="`${s.row.nodeCode} · ${s.row.nodeName || ''}`" placement="top">
              <el-tag effect="dark" size="small" style="font-family: 'Roboto Mono', Consolas, monospace;">{{ s.row.nodeCode }}</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="nodeName" label="账户册名称" width="220">
          <template slot-scope="s">
            <el-tooltip :content="s.row.nodeName" placement="top">
              <span class="ellipsis-cell" style="max-width: 210px;">{{ s.row.nodeName }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="isAsset" label="是否资产" width="90" align="center">
          <template slot-scope="s">
            <el-tag v-if="s.row.isAsset" type="success" effect="dark" size="small">是</el-tag>
            <el-tag v-else type="info" size="small">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="assetType" label="资产类型" width="140">
          <template slot-scope="s">
            <el-tag effect="plain" type="success" size="small">{{ s.row.assetType || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="assetOperator" label="资产运算符" width="100" align="center">
          <template slot-scope="s">
            <el-tag :type="opColor(s.row.assetOperator)" effect="dark" size="small" class="op-tag">{{ s.row.assetOperator || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isLiability" label="是否负债" width="90" align="center">
          <template slot-scope="s">
            <el-tag v-if="s.row.isLiability" type="success" effect="dark" size="small">是</el-tag>
            <el-tag v-else type="info" size="small">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="liabilityType" label="负债类型" width="140">
          <template slot-scope="s">
            <el-tag effect="plain" type="warning" size="small">{{ s.row.liabilityType || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="liabilityOperator" label="负债运算符" width="100" align="center">
          <template slot-scope="s">
            <el-tag :type="opColor(s.row.liabilityOperator)" effect="dark" size="small" class="op-tag">{{ s.row.liabilityOperator || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="久期(年)" width="130" align="right">
          <template slot-scope="s">
            <span class="num-cell">{{ fmtDuration(s.row.duration) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="ruleNote" label="规则说明" min-width="240">
          <template slot-scope="s">
            <el-tooltip :content="s.row.ruleNote" placement="top">
              <span class="ellipsis-cell" style="max-width: 230px; color: #666;">{{ s.row.ruleNote }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template slot-scope="s">
            <el-tag :type="s.row.status === 'ACTIVE' ? 'success' : 'info'" size="small">{{ s.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template slot-scope="s">
            <el-button type="text" @click="onEdit(s.row)">编辑</el-button>
            <el-button type="text" style="color:#C9332B" @click="onDelete(s.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增 / 编辑 对话框 -->
    <el-dialog :title="dlg.id ? `编辑 EVE 参数：${dlg.nodeCode}` : '新增 EVE 参数'" :visible.sync="dlg.show" width="820px" @closed="onCloseDlg">
      <el-form :model="dlg" label-width="110px" ref="formRef">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="账户册方案" required>
              <el-select v-model="dlg.schemeId" placeholder="选择方案" filterable style="width:100%" :disabled="!!dlg.id" @change="onSchemeChange">
                <el-option v-for="s in schemes" :key="s.id" :label="`${s.schemeCode} | ${s.schemeName}`" :value="s.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据日期" required>
              <el-date-picker v-model="dlg.dataDate" type="date" placeholder="选择日期" value-format="yyyy-MM-dd" style="width:100%" :disabled="!!dlg.id" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="账户册节点" required>
          <el-select v-model="dlg.nodeId" placeholder="选择节点（按方案过滤）" filterable style="width:100%" :disabled="!!dlg.id" @change="onNodeChange">
            <el-option v-for="n in nodesOfScheme" :key="n.id" :label="`${n.nodeCode} | ${n.nodeName}`" :value="n.id" />
          </el-select>
        </el-form-item>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="账户册编码">
              <el-input v-model="dlg.nodeCode" disabled placeholder="选择节点后自动填充" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="账户册名称">
              <el-input v-model="dlg.nodeName" disabled placeholder="选择节点后自动填充" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">资产端参数</el-divider>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="是否资产">
              <el-switch v-model="dlg.isAsset" active-color="#13c2c2" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="资产类型">
              <el-input v-model="dlg.assetType" placeholder="如：贷款 / 债券 / 同业 / 汇总" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="资产运算符">
              <el-select v-model="dlg.assetOperator" style="width:100%">
                <el-option v-for="o in operators" :key="o.dictKey" :label="o.dictLabel" :value="o.dictKey" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">负债端参数</el-divider>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="是否负债">
              <el-switch v-model="dlg.isLiability" active-color="#13c2c2" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="负债类型">
              <el-input v-model="dlg.liabilityType" placeholder="如：存款 / 同业拆入 / 应付债券 / 汇总" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="负债运算符">
              <el-select v-model="dlg.liabilityOperator" style="width:100%">
                <el-option v-for="o in operators" :key="o.dictKey" :label="o.dictLabel" :value="o.dictKey" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">久期 / 其他</el-divider>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="久期（年）">
              <el-input-number v-model="dlg.duration" :step="0.01" :precision="4" :min="0" controls-position="right" style="width:100%" />
              <div class="field-hint">用于加权久期 / EVE Δy 计算</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="当前余额">
              <el-input-number v-model="dlg.currentBalance" :precision="2" :step="1000" controls-position="right" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="规则说明">
          <el-input v-model="dlg.ruleNote" type="textarea" :rows="2" placeholder="如：对公一般贷款，IRRBB 标准利率冲击 +100bp" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="dlg.status">
            <el-radio-button label="ACTIVE">ACTIVE 启用</el-radio-button>
            <el-radio-button label="INACTIVE">INACTIVE 停用</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dlg.show = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import request from '@/api/request'

export default {
  data() {
    return {
      rows: [],
      schemes: [],
      nodes: [],
      operators: [],
      availableDates: [],
      flt: { schemeId: null, dataDate: '2025-12-31', keyword: '' },
      loading: false,
      dlg: this.initDlg()
    }
  },
  computed: {
    nodesOfScheme() {
      if (!this.flt.schemeId) return this.nodes
      // 表单内选中的方案优先
      const sid = this.dlg.schemeId || this.flt.schemeId
      return this.nodes.filter(n => n.schemeId === sid)
    },
    stats() {
      const total = this.rows.length
      const numYes = this.rows.filter(r => r.isAsset).length
      const denYes = this.rows.filter(r => r.isLiability).length
      return { total, numYes, denYes }
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
    initDlg() {
      return {
        show: false,
        id: null,
        schemeId: null,
        schemeCode: '',
        nodeId: null,
        nodeCode: '',
        nodeName: '',
        dataDate: '',
        isAsset: false,
        assetType: '',
        assetOperator: '+',
        isLiability: false,
        liabilityType: '',
        liabilityOperator: '+',
        duration: 0,
        currentBalance: 0,
        ruleNote: '',
        status: 'ACTIVE'
      }
    },
    fmtDuration(v) {
      if (v === null || v === undefined || v === '') return '-'
      const n = Number(v)
      if (isNaN(n)) return '-'
      return n.toFixed(4) + ' 年'
    },
    opColor(op) {
      if (op === '+') return 'primary'   // blue
      if (op === '-') return 'warning'   // orange
      return 'info'
    },
    async loadOptions() {
      try {
        const opt = await request.get('/eve-param/options')
        this.schemes = opt.schemes || []
        this.nodes = opt.nodes || []
        this.operators = opt.operators || []
        this.availableDates = opt.data_dates || []
        // 默认选 ZX_COA
        if (!this.flt.schemeId && this.schemes.length) {
          const zxcoa = this.schemes.find(s => s.schemeCode === 'ZX_COA')
          this.flt.schemeId = zxcoa ? zxcoa.id : this.schemes[0].id
        }
      } catch (e) {
        this.$message.error('选项加载失败')
      }
    },
    async loadList() {
      this.loading = true
      try {
        const params = {}
        if (this.flt.schemeId) params.schemeId = this.flt.schemeId
        if (this.flt.dataDate) params.dataDate = this.flt.dataDate
        if (this.flt.keyword) params.keyword = this.flt.keyword
        const data = await request.get('/eve-param', { params })
        this.rows = (data && data.items) || (Array.isArray(data) ? data : [])
      } catch (e) {
        this.$message.error(e.message || '列表加载失败')
      } finally {
        this.loading = false
      }
    },
    onReset() {
      const zxcoa = this.schemes.find(s => s.schemeCode === 'ZX_COA')
      this.flt.schemeId = zxcoa ? zxcoa.id : (this.schemes[0] ? this.schemes[0].id : null)
      this.flt.dataDate = '2025-12-31'
      this.flt.keyword = ''
      this.loadList()
    },
    onSchemeChange(v) {
      const sch = this.schemes.find(s => s.id === v)
      if (sch) {
        this.dlg.schemeId = sch.id
        this.dlg.schemeCode = sch.schemeCode
      }
      // 清空节点
      this.dlg.nodeId = null
      this.dlg.nodeCode = ''
      this.dlg.nodeName = ''
    },
    onNodeChange(v) {
      const sid = this.dlg.schemeId || this.flt.schemeId
      const nd = this.nodes.find(n => n.schemeId === sid && n.id === v)
      if (nd) {
        this.dlg.nodeCode = nd.nodeCode
        this.dlg.nodeName = nd.nodeName
      }
    },
    onAdd() {
      this.dlg = this.initDlg()
      const zxcoa = this.schemes.find(s => s.schemeCode === 'ZX_COA')
      const sch = this.schemes.find(s => s.id === this.flt.schemeId) || zxcoa
      if (sch) {
        this.dlg.schemeId = sch.id
        this.dlg.schemeCode = sch.schemeCode
      }
      this.dlg.dataDate = this.flt.dataDate || '2025-12-31'
      this.dlg.show = true
    },
    onEdit(row) {
      this.dlg = {
        show: true,
        id: row.id,
        schemeId: row.schemeId,
        schemeCode: row.schemeCode,
        nodeId: row.nodeId,
        nodeCode: row.nodeCode,
        nodeName: row.nodeName,
        dataDate: row.dataDate,
        isAsset: !!row.isAsset,
        assetType: row.assetType || '',
        assetOperator: row.assetOperator || '+',
        isLiability: !!row.isLiability,
        liabilityType: row.liabilityType || '',
        liabilityOperator: row.liabilityOperator || '+',
        duration: Number(row.duration || 0),
        currentBalance: Number(row.currentBalance || 0),
        ruleNote: row.ruleNote || '',
        status: row.status || 'ACTIVE'
      }
    },
    onCloseDlg() {
      this.dlg = this.initDlg()
    },
    async onSave() {
      if (!this.dlg.schemeId) { this.$message.error('请选择账户册方案'); return }
      if (!this.dlg.dataDate) { this.$message.error('请选择数据日期'); return }
      if (!this.dlg.nodeId) { this.$message.error('请选择账户册节点'); return }
      try {
        const body = {
          schemeId: this.dlg.schemeId,
          schemeCode: this.dlg.schemeCode,
          nodeId: this.dlg.nodeId,
          nodeCode: this.dlg.nodeCode,
          nodeName: this.dlg.nodeName,
          dataDate: this.dlg.dataDate,
          isAsset: this.dlg.isAsset ? 1 : 0,
          assetType: this.dlg.assetType,
          assetOperator: this.dlg.assetOperator,
          isLiability: this.dlg.isLiability ? 1 : 0,
          liabilityType: this.dlg.liabilityType,
          liabilityOperator: this.dlg.liabilityOperator,
          duration: this.dlg.duration,
          currentBalance: this.dlg.currentBalance,
          ruleNote: this.dlg.ruleNote,
          status: this.dlg.status || 'ACTIVE'
        }
        if (this.dlg.id) {
          await request.put('/eve-param/' + this.dlg.id, body)
          this.$message.success('已更新')
        } else {
          await request.post('/eve-param', body)
          this.$message.success('已新增')
        }
        this.dlg.show = false
        this.loadList()
      } catch (e) {
        this.$message.error(e.message || '保存失败')
      }
    },
    async onDelete(row) {
      try {
        await this.$confirm('确定删除该条 EVE 参数？', '确认', { type: 'warning' })
        await request.delete('/eve-param/' + row.id)
        this.$message.success('已删除')
        this.loadList()
      } catch (e) {
        if (e === 'cancel') return
        this.$message.error(e.message || '删除失败')
      }
    }
  }
}
</script>

<style scoped>
.page-wrap { padding: 16px; }
.header-card { border-top: 3px solid var(--citic-red); position: relative; }
.page-title { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 600; }
.page-title .sub { font-size: 12px; color: #999; font-weight: normal; margin-left: 8px; }
.header-extra { position: absolute; right: 20px; top: 16px; }
.kpi-card { margin-top: 12px; }
.filter-card { margin-top: 12px; }
.alert-card { margin-top: 12px; }
.mt-12 { margin-top: 12px; }
.kpi-cell {
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 4px;
  border-left: 3px solid var(--citic-red);
}
.kpi-label { font-size: 12px; color: #666; margin-bottom: 4px; }
.kpi-value { font-size: 24px; font-weight: 600; font-family: 'Roboto Mono', Consolas, monospace; }
.num-cell { font-family: 'Roboto Mono', Consolas, monospace; color: var(--citic-red); }
.ellipsis-cell {
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}
.op-tag { font-family: 'Roboto Mono', Consolas, monospace; font-weight: 600; min-width: 32px; text-align: center; }
.field-hint { font-size: 11px; color: #999; margin-top: 2px; line-height: 1.2; }
</style>