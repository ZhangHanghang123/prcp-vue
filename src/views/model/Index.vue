<template>
  <div class="model-page">
    <div class="page-header">
      <h2>📐 模型管理</h2>
      <p class="desc">模型定义与训练（DNN / 蚁群算法 / 神经网络 / 线性回归 等）</p>
    </div>

    <el-card class="filter-card" v-loading="loading">
      <el-row :gutter="16" type="flex" align="middle">
        <el-col :span="6">
          <el-input v-model="filter.keyword" placeholder="模型编码/名称" clearable @keyup.enter.native="loadModels" />
        </el-col>
        <el-col :span="4">
          <el-select v-model="filter.status" placeholder="状态" clearable @change="loadModels">
            <el-option label="ACTIVE 启用" value="ACTIVE" />
            <el-option label="INACTIVE 停用" value="INACTIVE" />
          </el-select>
        </el-col>
        <el-col :span="14">
          <el-button icon="el-icon-search" @click="loadModels">查询</el-button>
          <el-button icon="el-icon-refresh-left" @click="resetFilter">重置</el-button>
          <el-button type="primary" icon="el-icon-plus" @click="onAddModel">新增模型</el-button>
          <el-button type="success" icon="el-icon-cpu" @click="onCreateTrain" :disabled="!selectedModel">
            ⚡ 一键训练
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card style="margin-top:12px">
      <el-table :data="models" border stripe @row-click="onRowClick" :row-class-name="rowClass">
        <el-table-column prop="modelCode" label="模型编码" width="140">
          <template #default="{ row }">
            <span style="color:#C7000B;font-weight:600">{{ row.modelCode }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="modelName" label="模型名称" />
        <el-table-column prop="modelType" label="算法类型" width="160">
          <template #default="{ row }">
            <el-tag size="mini">{{ algoLabel(row.modelType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="bizDomain" label="业务域" width="120" />
        <el-table-column label="关联指标方案" width="220">
          <template #default="{ row }">
            <span v-if="row.kpiSchemeCode">
              <el-tag size="mini" type="info">{{ row.kpiSchemeCode }}</el-tag>
              <span style="margin-left:6px">{{ row.kpiSchemeName }}</span>
            </span>
            <span v-else style="color:#999">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="versionCount" label="版本数" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="mini" :type="row.versionCount > 0 ? 'success' : 'warning'">{{ row.versionCount || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="mini">
              {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="text" size="mini" icon="el-icon-cpu" @click.stop="onCreateTrain(row)">训练</el-button>
            <el-button type="text" size="mini" icon="el-icon-edit" @click.stop="onEditModel(row)">编辑</el-button>
            <el-button type="text" size="mini" icon="el-icon-delete" style="color:#f56c6c" @click.stop="onDeleteModel(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 模型新增/编辑弹窗 -->
    <el-dialog :title="editingModel ? '编辑模型' : '新增模型'" :visible.sync="modelModalVisible" width="600px">
      <el-form :model="modelForm" :rules="modelRules" ref="modelFormRef" label-width="100px">
        <el-form-item label="模型编码" prop="model_code">
          <el-input v-model="modelForm.model_code" :disabled="!!editingModel" />
        </el-form-item>
        <el-form-item label="模型名称" prop="model_name">
          <el-input v-model="modelForm.model_name" />
        </el-form-item>
        <el-form-item label="算法类型" prop="model_type">
          <el-select v-model="modelForm.model_type" filterable style="width:100%">
            <el-option v-for="a in algorithms" :key="a.code"
                       :label="`${a.code} (${a.name})`" :value="a.code">
              <span>{{ a.code }} - {{ a.name }}</span>
              <span style="float:right;color:#999">{{ a.category }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="业务域">
          <el-input v-model="modelForm.biz_domain" />
        </el-form-item>
        <el-form-item label="指标方案">
          <el-select v-model="modelForm.kpi_scheme_id" filterable clearable style="width:100%">
            <el-option v-for="s in schemeOpts" :key="s.id"
                       :label="`${s.scheme_code} | ${s.scheme_name}`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="modelForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="modelForm.status" style="width:120px">
            <el-option label="ACTIVE" value="ACTIVE" />
            <el-option label="INACTIVE" value="INACTIVE" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="modelModalVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmitModel">提交</el-button>
      </template>
    </el-dialog>

    <!-- 训练配置弹窗 -->
    <el-dialog title="🚀 一键训练" :visible.sync="trainModalVisible" width="520px">
      <el-form :model="trainForm" :rules="trainRules" ref="trainFormRef" label-width="100px">
        <el-form-item label="模型">
          <span style="color:#C7000B;font-weight:600">{{ trainForm.model_code }}</span>
          <span style="margin-left:6px">{{ trainForm.model_name }}</span>
        </el-form-item>
        <el-form-item label="训练窗口" prop="coa_scheme_id">
          <el-select v-model="trainForm.coa_scheme_id" style="width:100%">
            <el-option label="ZXCOA_V1 (中信账户册方案)" :value="6" />
          </el-select>
        </el-form-item>
        <el-form-item label="起始日期" prop="balance_date_from">
          <el-date-picker v-model="trainForm.balance_date_from" type="date" value-format="yyyy-MM-dd" style="width:100%" />
        </el-form-item>
        <el-form-item label="结束日期" prop="balance_date_to">
          <el-date-picker v-model="trainForm.balance_date_to" type="date" value-format="yyyy-MM-dd" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="trainForm.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="trainModalVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmitTrain">启动训练</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { modelApi } from '@/api/model'

/**
 * @file 模型管理
 * @desc 模型定义 + 一键训练。布局: 顶部筛选 (关键词/状态) + 表格 (编码/名称/算法类型/业务域/关联指标方案/版本数/状态) +
 *       模型编辑弹窗 + 训练弹窗 (训练窗口/起止日期/备注)。
 *       一键训练入口: 顶部按钮 (先选模型) + 行内"训练"按钮。
 *
 * @author zhanghh
 * @since 2026-10-09
 *
 * 关联 API:
 *   GET    /model/algorithms                  - 算法字典列表
 *   GET    /model/scheme-options              - 指标方案下拉选项
 *   GET    /model?keyword=&status=            - 模型列表 (含 versionCount JOIN)
 *   POST   /model                             - 新建模型
 *   PUT    /model/{id}                        - 更新模型
 *   DELETE /model/{id}                        - 删除模型 (级联软删版本/参数)
 *   POST   /model/{id}/train                  - 启动训练 (后台异步)
 *
 * 关联组件: 无
 * 关联路由: /model (group: 模型管理)
 */
export default {
  name: 'Model',
  data() {
    return {
      loading: false,
      submitting: false,
      algorithms: [],
      schemeOpts: [],
      models: [],
      selectedModel: null,
      /** 顶部筛选 (关键词/状态) */
      filter: { keyword: '', status: '' },

      modelModalVisible: false,
      editingModel: false,
      editingModelId: null,
      /** 模型编辑表单 (snake_case 字段: model_code/model_name/model_type/biz_domain/kpi_scheme_id) */
      modelForm: { model_code: '', model_name: '', model_type: 'LINEAR_REGRESSION', biz_domain: '', kpi_scheme_id: null, description: '', status: 'ACTIVE' },
      modelRules: {
        model_code: [{ required: true, message: '请输入模型编码', trigger: 'blur' }],
        model_name: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
        model_type: [{ required: true, message: '请选择算法', trigger: 'change' }]
      },

      trainModalVisible: false,
      /** 一键训练表单 (coa_scheme_id 默认 6=ZXCOA_V1, balance_date_from/to 训练窗口) */
      trainForm: { model_id: null, model_code: '', model_name: '', coa_scheme_id: 6, balance_date_from: '2025-12-01', balance_date_to: '2027-01-01', description: '' },
      trainRules: {
        coa_scheme_id: [{ required: true, message: '请选择训练窗口', trigger: 'change' }],
        balance_date_from: [{ required: true, message: '请选择起始日期', trigger: 'change' }],
        balance_date_to: [{ required: true, message: '请选择结束日期', trigger: 'change' }]
      }
    }
  },
  methods: {
    /**
     * <p>算法编码 → 中文/英文名</p>
     *
     * @param {string} code 算法编码 (LINEAR_REGRESSION/DNN/...)
     * @returns {string} 算法名
     */
    algoLabel(code) {
      const a = this.algorithms.find(x => x.code === code)
      return a ? a.name : code
    },
    /** 重置筛选条件 */
    resetFilter() {
      this.filter = { keyword: '', status: '' }
      this.loadModels()
    },
    /**
     * <p>表格行 class (选中行高亮)</p>
     *
     * @param {Object} param 行对象 (含 row)
     * @returns {string} class 名
     */
    rowClass({ row }) {
      return this.selectedModel && this.selectedModel.id === row.id ? 'row-selected' : ''
    },
    /**
     * <p>表格行点击 — 设置 selectedModel</p>
     *
     * @param {Object} row 行数据
     * @returns {void}
     */
    onRowClick(row) {
      this.selectedModel = row
    },
    /** 加载算法字典 */
    async loadAlgorithms() {
      const res = await modelApi.algorithms()
      this.algorithms = (res && res.items) || []
    },
    /** 加载指标方案下拉选项 */
    async loadSchemeOpts() {
      const res = await modelApi.schemeOptions()
      this.schemeOpts = (res && res.items) || []
    },
    /**
     * <p>按当前筛选条件加载模型列表</p>
     *
     * @returns {Promise<void>}
     */
    async loadModels() {
      this.loading = true
      try {
        const res = await modelApi.listModels({
          keyword: this.filter.keyword || undefined,
          status: this.filter.status || undefined
        })
        this.models = (res && res.items) || []
      } finally { this.loading = false }
    },
    /** 打开新增模型弹窗 */
    onAddModel() {
      this.editingModel = false
      this.editingModelId = null
      this.modelForm = { model_code: '', model_name: '', model_type: 'LINEAR_REGRESSION', biz_domain: '', kpi_scheme_id: null, description: '', status: 'ACTIVE' }
      this.modelModalVisible = true
    },
    /**
     * <p>打开编辑模型弹窗, 用行数据回填</p>
     *
     * @param {Object} row 模型行
     * @returns {void}
     */
    onEditModel(row) {
      this.editingModel = true
      this.editingModelId = row.id
      this.modelForm = {
        model_code: row.modelCode,
        model_name: row.modelName,
        model_type: row.modelType,
        biz_domain: row.bizDomain,
        kpi_scheme_id: row.kpiSchemeId,
        description: row.description,
        status: row.status
      }
      this.modelModalVisible = true
    },
    /**
     * <p>提交模型弹窗 (新增或更新), 带表单校验</p>
     *
     * @returns {Promise<void>}
     */
    async onSubmitModel() {
      this.$refs.modelFormRef.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          if (this.editingModel) {
            await modelApi.updateModel(this.editingModelId, this.modelForm)
          } else {
            await modelApi.createModel(this.modelForm)
          }
          this.$message.success(this.editingModel ? '已更新' : '已创建')
          this.modelModalVisible = false
          this.loadModels()
        } catch (e) {
          this.$message.error('提交失败：' + (e.message || ''))
        } finally { this.submitting = false }
      })
    },
    /**
     * <p>删除模型 (级联软删其下版本/参数, 带 confirm)</p>
     *
     * @param {Object} row 模型行 (含 id/modelName)
     * @returns {void}
     */
    onDeleteModel(row) {
      this.$confirm(`确定删除模型「${row.modelName}」？会级联软删其下所有版本和参数。`, '提示', { type: 'warning' }).then(async () => {
        await modelApi.removeModel(row.id)
        this.$message.success('已删除')
        if (this.selectedModel && this.selectedModel.id === row.id) {
          this.selectedModel = null
        }
        this.loadModels()
      }).catch(() => {})
    },
    /**
     * <p>打开一键训练弹窗 (row 不传则用 selectedModel)</p>
     *
     * @param {Object} [row] 模型行, 不传则用 selectedModel
     * @returns {void}
     */
    onCreateTrain(row) {
      const target = row || this.selectedModel
      if (!target) {
        this.$message.warning('请先选择一个模型')
        return
      }
      this.trainForm = {
        model_id: target.id,
        model_code: target.modelCode,
        model_name: target.modelName,
        coa_scheme_id: 6,
        balance_date_from: '2025-12-01',
        balance_date_to: '2027-01-01',
        description: ''
      }
      this.trainModalVisible = true
    },
    /**
     * <p>提交一键训练 (后台异步执行, 完成后去结果页查看)</p>
     *
     * @returns {Promise<void>}
     */
    async onSubmitTrain() {
      this.$refs.trainFormRef.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          const payload = {
            coa_scheme_id: this.trainForm.coa_scheme_id,
            balance_date_from: this.trainForm.balance_date_from,
            balance_date_to: this.trainForm.balance_date_to,
            description: this.trainForm.description
          }
          await modelApi.startTrain(this.trainForm.model_id, payload)
          this.$message.success('训练已启动，可前往结果查看')
          this.trainModalVisible = false
          this.loadModels()
        } catch (e) {
          this.$message.error('启动失败：' + (e.message || ''))
        } finally { this.submitting = false }
      })
    }
  },
  mounted() {
    this.loadAlgorithms()
    this.loadSchemeOpts()
    this.loadModels()
  }
}
</script>

<style scoped>
.model-page { padding: 16px; }
.page-header h2 { margin: 0 0 4px; color: #303133; }
.page-header .desc { margin: 0 0 16px; color: #909399; font-size: 13px; }
::v-deep .el-table .row-selected {
  background-color: #fef0f0 !important;
}
::v-deep .el-table .row-selected td {
  background-color: #fef0f0 !important;
}
</style>
