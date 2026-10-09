<template>
  <div class="kpi-page">
    <div class="page-header">
      <h2>指标管理</h2>
      <p class="desc">指标方案 / 公式引擎 / 多版本结果</p>
    </div>

    <!-- 当前指标方案 选择器 -->
    <el-card class="scheme-pick">
      <el-row :gutter="12" type="flex" align="middle">
        <el-col :span="3" class="pick-label"><i class="el-icon-collection-tag"></i> 当前指标方案：</el-col>
        <el-col :span="10">
          <el-select v-model="currentSchemeId" placeholder="请选择指标方案（先选才能看定义与维护）"
                     filterable style="width:100%" @change="onSchemeChange">
            <el-option v-for="s in schemes" :key="s.id"
                       :label="`${s.schemeCode} | ${s.schemeName}`" :value="s.id" />
          </el-select>
        </el-col>
        <el-col :span="11">
          <el-tag v-if="currentScheme" type="danger" effect="dark" size="medium">
            ✓ 本方案
          </el-tag>
          <el-tag v-else type="info" size="medium">未选方案</el-tag>
          <el-button type="text" style="margin-left:12px" @click="activeTab='scheme'">+ 新建方案</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 4 个 Tab -->
    <el-card class="main-card">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- ============ Tab1: 指标方案 ============ -->
        <el-tab-pane label="指标方案" name="scheme">
          <el-row :gutter="12" type="flex" align="middle" style="margin-bottom:12px">
            <el-col :span="24">
              <el-button type="danger" icon="el-icon-plus" @click="onAddScheme">新增方案</el-button>
              <el-button icon="el-icon-refresh" @click="loadAllSchemes">刷新</el-button>
            </el-col>
          </el-row>
          <el-table :data="allSchemes" border stripe v-loading="schemeLoading">
            <el-table-column type="index" label="#" width="50" align="center" />
            <el-table-column prop="schemeCode" label="方案编码" width="180" />
            <el-table-column prop="schemeName" label="方案名称" />
            <el-table-column prop="kpiCount" label="指标数" width="80" align="center">
              <template #default="{ row }">
                <el-tag size="mini">{{ row.kpiCount || 0 }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="mini">
                  {{ row.status || 'ACTIVE' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" show-overflow-tooltip />
            <el-table-column label="操作" width="180" align="center">
              <template #default="{ row }">
                <el-button type="text" @click="onUseScheme(row)">进入</el-button>
                <el-button type="text" @click="onEditScheme(row)">编辑</el-button>
                <el-button type="text" style="color:#f56c6c;" @click="onDeleteScheme(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- ============ Tab2: 指标定义 ============ -->
        <el-tab-pane label="指标定义" name="def">
          <el-alert v-if="!currentSchemeId" title="请先选择【当前指标方案】" type="warning" :closable="false" show-icon style="margin-bottom:12px" />
          <el-row :gutter="12" type="flex" align="middle" style="margin-bottom:12px">
            <el-col :span="6">
              <el-input v-model="defFilter.keyword" placeholder="编码/名称" clearable @keyup.enter.native="loadDefs" />
              </el-col>
              <el-col :span="18">
                <el-button type="danger" icon="el-icon-plus" :disabled="!currentSchemeId" @click="onAddDef">新增指标</el-button>
                <span v-if="currentScheme" style="margin-left:12px;color:#888">当前：<b>{{ currentScheme.schemeCode }} | {{ currentScheme.schemeName }}</b></span>
              </el-col>
            </el-row>
          <el-table :data="defs" border stripe v-loading="defLoading">
            <el-table-column type="index" label="#" width="50" align="center" />
            <el-table-column prop="kpiCode" label="编码" width="120" />
            <el-table-column prop="kpiName" label="名称" min-width="180" show-overflow-tooltip />
            <el-table-column label="单位" width="80" align="center">
              <template #default="{ row }">
                {{ unitLabel(row.calcUnit) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" align="center">
              <template #default="{ row }">
                <el-button type="text" @click="onEditDef(row)">编辑</el-button>
                <el-button type="text" style="color:#f56c6c;" @click="onDeleteDef(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- ============ Tab3: 指标评分（左：指标列表 / 右：评分规则） ============ -->
        <el-tab-pane label="指标评分" name="rule">
          <el-alert v-if="!currentSchemeId" title="请先选择【当前指标方案】" type="warning" :closable="false" show-icon style="margin-bottom:12px" />

          <div class="kpi-score-layout">
            <!-- 左栏：方案指标列表 -->
            <div class="kpi-score-left">
              <el-input v-model="defKeyword" placeholder="搜索编码 / 名称" clearable size="small" style="margin-bottom:8px" />
              <div class="kpi-def-list">
                <div v-for="d in filteredDefs" :key="d.id"
                     class="kpi-def-card"
                     :class="{ active: selectedDefId === d.id }"
                     @click="onSelectDef(d)">
                  <div class="kpi-def-code">{{ d.kpiCode }}</div>
                  <div class="kpi-def-name">{{ d.kpiName }}</div>
                  <div class="kpi-def-meta">
                    <i class="el-icon-collection-tag"></i>
                    {{ (d.segmentsCount != null ? d.segmentsCount + ' 段' : (ruleCountByKpi(d.id) + ' 段')) }}
                  </div>
                </div>
                <div v-if="!filteredDefs.length" class="empty-tip">当前方案还没有指标</div>
              </div>
            </div>

            <!-- 右栏：选中指标的评分规则 -->
            <div class="kpi-score-right">
              <div v-if="!selectedDefId" class="empty-pane">
                <i class="el-icon-arrow-left"></i> 请在左侧选择一个指标
              </div>
              <div v-else>
                <div class="score-pane-header">
                  <div>
                    <span class="kpi-score-title">
                      <i class="el-icon-collection"></i>
                      {{ selectedDefKpi.kpiCode }} · {{ selectedDefKpi.kpiName }}
                    </span>
                    <el-tag size="mini" type="info" effect="plain" style="margin-left:8px">
                      {{ currentScheme ? currentScheme.schemeCode : '' }}
                    </el-tag>
                  </div>
                  <div>
                    <el-button icon="el-icon-refresh" size="small" @click="loadRules">刷新</el-button>
                    <el-tooltip content="新增分段评分规则（按 min/max 区间 → 分数）" placement="top">
                      <el-button type="danger" icon="el-icon-plus" size="small" @click="onAddRule">新增规则</el-button>
                    </el-tooltip>
                    <el-tooltip content="新增线性插值评分规则（多个 (x, score) 锚点，按段间线性插值）" placement="top">
                      <el-button type="primary" plain icon="el-icon-plus" size="small"
                                 style="background:#e6f4ff;border-color:#91caff;color:#1677ff"
                                 @click="onAddLinearRule">新增线性规则</el-button>
                    </el-tooltip>
                  </div>
                </div>

                <el-table :data="rulesForKpi" border stripe size="small" v-loading="ruleLoading"
                          :expand-row-keys="expandedRowIds" @expand-change="onExpandChange" row-key="id">
                  <el-table-column type="expand">
                    <template #default="{ row }">
                      <div class="seg-panel">
                        <div class="seg-panel-title">
                          <i :class="row.calcMethod === 'LINEAR' ? 'el-icon-data-line' : 'el-icon-s-data'"></i>
                          <template v-if="row.calcMethod === 'LINEAR'">⚓ 锚点（线性插值）</template>
                          <template v-else>📊 评分段（区间命中）</template>
                          （{{ (row.segments || []).length }} {{ row.calcMethod === 'LINEAR' ? '锚点' : '段' }}）
                        </div>
                        <el-tag v-for="(s, i) in (row.segments || [])" :key="s.id || i"
                                :type="row.calcMethod === 'LINEAR' ? 'primary' : 'plain'"
                                class="seg-tag" effect="plain">
                          <template v-if="row.calcMethod === 'LINEAR'">
                            <span class="seg-range">x = <strong>{{ s.minValue != null ? s.minValue : s.maxValue }}</strong></span>
                            <span class="seg-arrow">→</span>
                            <span class="seg-score"><strong>{{ s.score }}</strong> 分</span>
                            <span v-if="s.segmentDesc" class="seg-desc">· {{ s.segmentDesc }}</span>
                          </template>
                          <template v-else>
                            <span class="seg-range">
                              {{ s.minValue != null ? '≥ ' + s.minValue : '−∞' }} ~ {{ s.maxValue != null ? '< ' + s.maxValue : '+∞' }}
                            </span>
                            <span class="seg-arrow">→</span>
                            <span class="seg-score">{{ s.score }} 分</span>
                            <span v-if="s.segmentDesc" class="seg-desc">· {{ s.segmentDesc }}</span>
                          </template>
                        </el-tag>
                        <div v-if="!((row.segments || []).length)" class="empty-tip">暂无评分段</div>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column prop="ruleName" label="规则名称" min-width="200">
                    <template #default="{ row }">
                      <strong>{{ row.ruleName }}</strong>
                    </template>
                  </el-table-column>
                  <el-table-column label="算法" width="80" align="center">
                    <template #default="{ row }">
                      <el-tag size="mini" :type="row.calcMethod === 'LINEAR' ? 'primary' : 'info'">
                        <i :class="row.calcMethod === 'LINEAR' ? 'el-icon-data-line' : 'el-icon-s-data'" style="margin-right:2px"></i>
                        {{ row.calcMethod === 'LINEAR' ? '📈 线性' : '🔢 分段' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="totalScore" label="总分" width="80" align="right">
                    <template #default="{ row }">
                      <el-tag size="mini" type="info">{{ row.totalScore }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="方向" width="100" align="center">
                    <template #default="{ row }">
                      <el-tag size="mini" :type="(row.higherIsBetter === 1 || row.higherIsBetter === true) ? 'success' : 'warning'">
                        {{ (row.higherIsBetter === 1 || row.higherIsBetter === true) ? '↑ 正向' : '↓ 逆向' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="段数" width="80" align="center">
                    <template #default="{ row }">
                      {{ (row.segments || []).length }} 段
                    </template>
                  </el-table-column>
                  <el-table-column prop="status" label="状态" width="80" align="center">
                    <template #default="{ row }">
                      <el-tag size="mini" :type="row.status === 'ACTIVE' ? 'success' : 'info'">{{ row.status || 'ACTIVE' }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="180" align="center" fixed="right">
                    <template #default="{ row }">
                      <el-button type="text" @click="onEditRule(row)">编辑</el-button>
                      <el-button type="text" style="color:#f56c6c;" @click="onDeleteRule(row)">删除</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- ============ KPI 定义 Modal ============ -->
    <el-dialog :title="defModalTitle" :visible.sync="defModalVisible" width="640px">
      <el-form :model="defForm" :rules="defRules" ref="defFormRef" label-width="100px">
        <el-form-item label="指标编码" prop="kpiCode"><el-input v-model="defForm.kpiCode" /></el-form-item>
        <el-form-item label="指标名称" prop="kpiName"><el-input v-model="defForm.kpiName" /></el-form-item>
        <el-form-item label="指标方案" prop="schemeId">
          <el-select v-model="defForm.schemeId" style="width:100%" filterable>
            <el-option v-for="s in schemes" :key="s.id" :label="`${s.schemeCode} | ${s.schemeName}`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联报表">
          <el-input-number v-model="defForm.rptId" :min="0" />
        </el-form-item>
        <el-form-item label="公式/脚本">
          <el-input v-model="defForm.formula" type="textarea" :rows="3" placeholder="A+B-C 或 calc_func()" />
        </el-form-item>
        <el-form-item label="单位">
          <el-select v-model="defForm.calcUnit" style="width:100%">
            <el-option label="PERCENT 百分比" value="PERCENT" />
            <el-option label="ABSOLUTE 绝对值" value="ABSOLUTE" />
          </el-select>
        </el-form-item>
        <el-form-item label="阈值范围">
          <el-input-number v-model="defForm.thresholdMin" :precision="4" placeholder="下限" />
          ~
          <el-input-number v-model="defForm.thresholdMax" :precision="4" placeholder="上限" />
        </el-form-item>
        <el-form-item label="说明"><el-input v-model="defForm.formulaDesc" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="defModalVisible=false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmitDef">提交</el-button>
      </template>
    </el-dialog>

    <!-- ============ 评分规则 Modal（新增/编辑 + 评分段内联表） ============ -->
    <el-dialog :title="editingRule ? '编辑评分规则' : '新增评分规则'"
               :visible.sync="ruleModalVisible" width="780px" @closed="onRuleModalClosed">
      <el-form :model="ruleForm" label-width="100px">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="所属方案">
              <el-select v-model="ruleForm.schemeId" style="width:100%" disabled>
                <el-option v-for="s in schemes" :key="s.id"
                           :label="s.schemeCode + ' | ' + s.schemeName" :value="s.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属指标">
              <el-select v-model="ruleForm.kpiId" style="width:100%" filterable :disabled="!!editingRule">
                <el-option v-for="d in defs" :key="d.id"
                           :label="d.kpiCode + ' | ' + d.kpiName" :value="d.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="10">
            <el-form-item label="规则名称"><el-input v-model="ruleForm.ruleName" placeholder="如：标准分段评分" /></el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="计算方法">
              <el-select v-model="ruleForm.calcMethod" style="width:100%">
                <el-option label="分段" value="PIECEWISE" />
                <el-option label="线性" value="LINEAR" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="总分" label-width="50px"><el-input-number v-model="ruleForm.totalScore" :min="0" :precision="2" style="width:100%" /></el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="方向" label-width="50px">
              <el-select v-model="ruleForm.higherIsBetter" style="width:100%">
                <el-option label="↑ 正向" :value="1" />
                <el-option label="↓ 逆向" :value="0" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="18">
            <el-form-item label="状态">
              <el-select v-model="ruleForm.status" style="width:140px">
                <el-option label="ACTIVE" value="ACTIVE" />
                <el-option label="INACTIVE" value="INACTIVE" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="规则说明">
          <el-input v-model="ruleForm.description" type="textarea" :rows="2"
                    placeholder="如：ROE ≥ 11% 得 100 分；9-11% 得 80 分；<9% 得 60 分" />
        </el-form-item>

        <!-- 评分段（内联可编辑表 — PIECEWISE 区间 / LINEAR 锚点 两种结构） -->
        <div class="seg-block">
          <div class="seg-block-header">
            <span>
              <i :class="ruleForm.calcMethod === 'LINEAR' ? 'el-icon-data-line' : 'el-icon-s-data'"></i>
              <template v-if="ruleForm.calcMethod === 'LINEAR'">⚓ 线性锚点（min_value = 输入值，score = 该点的得分）</template>
              <template v-else>📊 评分段（按指标值区间 → 分数）</template>
            </span>
            <el-button type="text" icon="el-icon-plus" size="mini" @click="addSegment">
              {{ ruleForm.calcMethod === 'LINEAR' ? '添加锚点' : '添加段' }}
            </el-button>
          </div>
          <div class="seg-block-tip">
            <template v-if="ruleForm.calcMethod === 'LINEAR'">
              💡 提示：每行是一个<b>锚点</b>。<strong>最小值</strong> = 指标值 x，<strong>分数</strong> = 该点的得分。
              锚点之间按 x 轴线性插值；输入值超出区间则按端点 clamp（取最近锚点分数）。
            </template>
            <template v-else>
              💡 提示：每段填写 <b>最小值 ≥</b>（含）和 <b>最大值 &lt;</b>（不含）。两端可留空表示 -∞ 或 +∞。
            </template>
          </div>
          <el-table :data="ruleForm.segments" border size="mini" style="width:100%">
            <el-table-column label="序号" width="60" align="center">
              <template #default="{ row }">
                <el-input-number v-model="row.seg_order" :min="1" :max="99" size="mini" controls-position="right" style="width:100%" />
              </template>
            </el-table-column>
            <!-- LINEAR 模式：只显示锚点 x 和 score -->
            <template v-if="ruleForm.calcMethod === 'LINEAR'">
              <el-table-column label="锚点 x (指标值)" width="160">
                <template #default="{ row }">
                  <el-input-number v-model="row.min_value" :precision="6" placeholder="如：8" size="mini" controls-position="right" style="width:100%" />
                </template>
              </el-table-column>
              <el-table-column label="锚点 score" width="120">
                <template #default="{ row }">
                  <el-input-number v-model="row.score" :min="0" :max="999" :precision="4" size="mini" controls-position="right" style="width:100%" />
                </template>
              </el-table-column>
            </template>
            <!-- PIECEWISE 模式：显示 min/max/score -->
            <template v-else>
              <el-table-column label="最小值 ≥" width="110">
                <template #default="{ row }">
                  <el-input-number v-model="row.min_value" :precision="6" placeholder="-∞" size="mini" controls-position="right" style="width:100%" />
                </template>
              </el-table-column>
              <el-table-column label="最大值 &lt;" width="110">
                <template #default="{ row }">
                  <el-input-number v-model="row.max_value" :precision="6" placeholder="+∞" size="mini" controls-position="right" style="width:100%" />
                </template>
              </el-table-column>
              <el-table-column label="分数" width="90">
                <template #default="{ row }">
                  <el-input-number v-model="row.score" :min="0" :precision="4" size="mini" controls-position="right" style="width:100%" />
                </template>
              </el-table-column>
            </template>
            <el-table-column label="描述">
              <template #default="{ row }">
                <el-input v-model="row.segment_desc" :placeholder="ruleForm.calcMethod === 'LINEAR' ? '如：监管底线 8% → 60 分' : '如：优秀 / 及格 / 不及格'" size="mini" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="60" align="center">
              <template #default="{ $index }">
                <el-button type="text" icon="el-icon-delete" size="mini" style="color:#f56c6c" @click="removeSegment($index)" />
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="ruleModalVisible=false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmitRule">保存</el-button>
      </template>
    </el-dialog>

    <!-- ============ 指标方案 Modal ============ -->
    <el-dialog :title="editingScheme ? '编辑方案' : '新增方案'"
               :visible.sync="schemeFormVisible" width="540px">
      <el-form :model="schemeForm" :rules="schemeRules" ref="schemeFormRef" label-width="100px">
        <el-form-item label="方案编码" prop="schemeCode">
          <el-input v-model="schemeForm.schemeCode" placeholder="例如 SCH_PNN_TRAIN_17_99061500" />
        </el-form-item>
        <el-form-item label="方案名称" prop="schemeName">
          <el-input v-model="schemeForm.schemeName" placeholder="例如 PNN 训练指标方案" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="schemeForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item v-if="editingScheme" label="状态">
          <el-radio-group v-model="schemeForm.status">
            <el-radio-button label="ACTIVE">启用</el-radio-button>
            <el-radio-button label="INACTIVE">停用</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="schemeFormVisible = false">取消</el-button>
        <el-button type="primary" :loading="schemeSubmitting" @click="onSchemeSubmit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { kpiApi } from '@/api/kpi'

/**
 * @file 指标管理 (KPI 评分 — PIECEWISE 分段 + LINEAR 线性插值)
 * @desc 指标方案 + 指标定义 + 评分规则 三层结构。包含 3 个 Tab:
 *         1) 指标方案 - 方案 CRUD, 含状态 ACTIVE/INACTIVE
 *         2) 指标定义 - 当前方案下的指标列表 (编码/名称/单位/公式/阈值)
 *         3) 指标评分 - 左栏指标卡片 + 右栏规则列表 (含 评分段/锚点 tag)
 *
 *       评分规则支持 2 种计算方法 (calc_method):
 *       - PIECEWISE 分段: 每段 [min, max) 区间, 命中区间直接取该段 score
 *       - LINEAR  线性:   每段是一个锚点 (min_value=x, score=y), 段之间按 x 轴线性插值;
 *                          输入值超出区间则按端点 clamp (取最近锚点分数)
 *
 *       全局联动 currentSchemeId, 切换后自动加载指标定义和评分规则。
 *
 * @author zhanghh
 * @since 2026-10-09
 *
 * 关联 API:
 *   GET    /kpi/scheme            - 当前活动方案 (用于顶部联动下拉)
 *   GET    /kpi/scheme/all        - 全部方案 (用于 Tab1)
 *   POST   /kpi/scheme            - 新建方案
 *   PUT    /kpi/scheme/{id}       - 更新方案
 *   DELETE /kpi/scheme/{id}       - 删除方案 (级联)
 *   GET    /kpi/def?scheme_id=&keyword= - 当前方案的指标定义列表
 *   POST   /kpi/def               - 新建指标
 *   PUT    /kpi/def/{id}          - 更新指标
 *   DELETE /kpi/def/{id}          - 删除指标
 *   GET    /kpi/score-rule?scheme_id= - 当前方案的评分规则列表 (含内嵌 segments)
 *   POST   /kpi/score-rule        - 新建评分规则 (含 calc_method)
 *   PUT    /kpi/score-rule/{id}   - 更新评分规则
 *   DELETE /kpi/score-rule/{id}   - 删除评分规则 (级联 segments)
 *   POST   /kpi/score-calc        - 按规则 + 指标值算分 (支持 PIECEWISE/LINEAR)
 *
 * 关联组件: 无
 * 关联路由: /kpi (group: 指标管理)
 */
export default {
  name: 'KpiIndex',
  data() {
    return {
      activeTab: 'scheme',
      schemes: [],

      // 当前选中方案（全局联动）
      currentSchemeId: null,

      // Tab1 指标方案
      allSchemes: [],
      schemeLoading: false,
      schemeFormVisible: false,
      editingScheme: null,
      schemeSubmitting: false,
      /** 方案编辑表单 */
      schemeForm: { schemeCode: '', schemeName: '', description: '', status: 'ACTIVE' },
      schemeRules: {
        schemeCode: [{ required: true, message: '请输入方案编码' }],
        schemeName: [{ required: true, message: '请输入方案名称' }]
      },

      // Tab2 指标定义
      defs: [],
      defFilter: { keyword: '' },
      defLoading: false,
      defModalVisible: false, defModalTitle: '', editingDef: null,

      // Tab3 指标评分（左栏指标 + 右栏规则）
      defKeyword: '',
      selectedDefId: null,
      expandedRowIds: [],
      editingRule: null, // null=新增，否则=正在编辑的规则对象
      /** 指标编辑表单 (含 kpiCode/kpiName/schemeId/formula/calcUnit/threshold) */
      defForm: { kpiCode: '', kpiName: '', schemeId: null, rptId: null, formula: '', calcUnit: 'PERCENT', thresholdMin: null, thresholdMax: null, formulaDesc: '' },
      defRules: { kpiCode: [{ required: true }], kpiName: [{ required: true }] },

      // Tab3 评分规则
      rules: [],
      ruleLoading: false,
      ruleModalVisible: false,
      /** 评分规则编辑表单 (含内嵌 segments: [{seg_order,min_value,max_value,score,segment_desc}]) */
      ruleForm: {
        kpiId: null, ruleName: '', schemeId: null, totalScore: 100,
        higherIsBetter: 1, calcMethod: 'PIECEWISE', status: 'ACTIVE', description: '',
        segments: []
      },

      submitting: false
    }
  },
  computed: {
    currentScheme() {
      return this.schemes.find(s => s.id === this.currentSchemeId)
    },
    // Tab3 左栏：过滤后的指标列表
    filteredDefs() {
      const kw = (this.defKeyword || '').toLowerCase().trim()
      if (!kw) return this.defs
      return this.defs.filter(d =>
        (d.kpiCode || '').toLowerCase().includes(kw) ||
        (d.kpiName || '').toLowerCase().includes(kw)
      )
    },
    // Tab3 右栏：当前选中指标
    selectedDefKpi() {
      return this.defs.find(d => d.id === this.selectedDefId) || {}
    },
    // Tab3 右栏：当前选中指标的所有规则
    rulesForKpi() {
      if (!this.selectedDefId) return []
      return this.rules.filter(r => r.kpiId === this.selectedDefId)
    }
  },
  async mounted() {
    await Promise.all([
      this.loadSchemes(),
      this.loadAllSchemes()
    ])
    if (this.schemes.length) {
      this.currentSchemeId = this.schemes[0].id
    }
    await this.loadAllData()
  },
  watch: {
    currentSchemeId() {
      this.loadAllData()
    }
  },
  methods: {
    // ===== Tab3 指标评分 =====
    /**
     * <p>选中左栏的指标卡片</p>
     *
     * @param {Object} d 指标行
     * @returns {void}
     */
    onSelectDef(d) {
      this.selectedDefId = d.id
    },
    /** 折叠行展开事件 — 一次只允许展开一行 */
    onExpandChange(row, expanded) {
      // 允许一次只展开一行
      if (expanded.length) this.expandedRowIds = [expanded[expanded.length - 1]]
      else this.expandedRowIds = []
    },
    /**
     * <p>按 kpiId 计算该指标的规则数</p>
     *
     * @param {number} kpiId 指标 ID
     * @returns {number} 规则数
     */
    ruleCountByKpi(kpiId) {
      return this.rules.filter(r => r.kpiId === kpiId).length
    },
    // ===== 单位字典（calcUnit 编码 → 中文）=====
    /**
     * <p>单位编码 → 中文标签 (含 PERCENT/WAN_YUAN/BPS/DAY 等 16 种)</p>
     *
     * @param {string} unit 单位编码
     * @returns {string} 中文标签
     */
    unitLabel(unit) {
      const map = {
        PERCENT: '百分比',
        PERCENTAGE: '百分比',
        PERMILLE: '千分比',
        YUAN: '元',
        AMOUNT: '金额',
        WAN_YUAN: '万元',
        YI_YUAN: '亿元',
        BAI_FEN_BI: '百分比',
        CI: '次',
        GE: '个',
        RATIO: '比率',
        POINTS: '基点',
        BPS: '基点',
        DAY: '日',
        MONTH: '月',
        YEAR: '年',
        SCORE: '分数'
      }
      return map[unit] || unit || '-'
    },
    /** 加载当前活动方案 (用于顶部联动下拉) */
    async loadSchemes() {
      this.schemes = await kpiApi.listSchemes()
    },
    /** 加载全部方案 (含 INACTIVE) — 用于 Tab1 列表 */
    async loadAllSchemes() {
      this.schemeLoading = true
      try { this.allSchemes = await kpiApi.listSchemesAll() }
      finally { this.schemeLoading = false }
    },
    /** 同时加载当前方案的指标定义 + 评分规则 */
    async loadAllData() {
      await this.loadDefs()
      await this.loadRules()
    },
    /** 当前方案切换回调 (watch 已自动触发 loadAllData) */
    async onSchemeChange() {
      // watch 已自动调用 loadAllData
    },

    /** 按当前方案 + keyword 加载指标定义 */
    async loadDefs() {
      this.defLoading = true
      try {
        this.defs = await kpiApi.listDefs({
          scheme_id: this.currentSchemeId,
          keyword: this.defFilter.keyword
        })
      } finally { this.defLoading = false }
    },
    /** 按当前方案加载评分规则 (含内嵌 segments) */
    async loadRules() {
      this.ruleLoading = true
      try { this.rules = await kpiApi.listScoreRules({ scheme_id: this.currentSchemeId }) }
      finally { this.ruleLoading = false }
    },

    // ===== 指标定义 CRUD =====
    /** 打开新增指标弹窗 (默认 schemeId 为当前方案) */
    onAddDef() {
      this.editingDef = null
      this.defForm = { kpiCode: '', kpiName: '', schemeId: this.currentSchemeId, rptId: null,
                       formula: '', calcUnit: 'PERCENT', thresholdMin: null, thresholdMax: null, formulaDesc: '' }
      this.defModalTitle = '新增指标'; this.defModalVisible = true
    },
    /**
     * <p>打开编辑指标弹窗, 用行数据回填</p>
     *
     * @param {Object} row 指标行
     * @returns {void}
     */
    onEditDef(row) {
      this.editingDef = row
      this.defForm = { ...row }
      this.defModalTitle = '编辑指标'; this.defModalVisible = true
    },
    /** 提交指标弹窗 (新增或更新) */
    async onSubmitDef() {
      await this.$refs.defFormRef.validate()
      this.submitting = true
      try {
        if (this.editingDef) await kpiApi.updateDef(this.editingDef.id, this.defForm)
        else await kpiApi.createDef(this.defForm)
        this.$message.success('已保存'); this.defModalVisible = false; this.loadDefs()
      } finally { this.submitting = false }
    },
    /**
     * <p>删除指标 (带 confirm 二次确认)</p>
     *
     * @param {Object} row 指标行 (含 id/kpiCode/kpiName)
     * @returns {void}
     */
    onDeleteDef(row) {
      this.$confirm(`确认删除 [${row.kpiCode}] ${row.kpiName}？`, '提示', { type: 'warning' })
        .then(async () => { await kpiApi.deleteDef(row.id); this.$message.success('已删除'); this.loadDefs() })
        .catch(() => {})
    },

    // ===== 评分规则 =====
    /** 打开新增评分规则弹窗 (默认 PIECEWISE + 3 段模板: <9 / 9-11 / >=11) */
    onAddRule() {
      this.editingRule = null
      this.ruleForm = {
        kpiId: this.selectedDefId || null,
        ruleName: '',
        schemeId: this.currentSchemeId,
        totalScore: 100,
        higherIsBetter: 1,
        calcMethod: 'PIECEWISE',
        status: 'ACTIVE',
        description: '',
        segments: [
          { seg_order: 1, min_value: null, max_value: 9, score: 60, segment_desc: '不及格' },
          { seg_order: 2, min_value: 9, max_value: 11, score: 80, segment_desc: '及格' },
          { seg_order: 3, min_value: 11, max_value: null, score: 100, segment_desc: '优秀' }
        ]
      }
      this.ruleModalVisible = true
    },
    /** 打开新增 LINEAR 评分规则弹窗 (默认 2 个锚点: x=8→60 / x=15→100) */
    onAddLinearRule() {
      this.editingRule = null
      this.ruleForm = {
        kpiId: this.selectedDefId || null,
        ruleName: '',
        schemeId: this.currentSchemeId,
        totalScore: 100,
        higherIsBetter: 1,
        calcMethod: 'LINEAR',
        status: 'ACTIVE',
        description: '',
        segments: [
          { seg_order: 1, min_value: 8,  max_value: null, score: 60,  segment_desc: '监管底线' },
          { seg_order: 2, min_value: 15, max_value: null, score: 100, segment_desc: '优秀' }
        ]
      }
      this.ruleModalVisible = true
    },
    /**
     * <p>打开编辑评分规则弹窗, 用行数据回填 (含 segments)</p>
     *
     * @param {Object} row 规则行 (含内嵌 segments)
     * @returns {void}
     */
    onEditRule(row) {
      this.editingRule = row
      // 把后端返回的 segments（snake_case + number）映射成前端 form 字段（camelCase + el-input-number null 兼容）
      this.ruleForm = {
        kpiId: row.kpiId,
        ruleName: row.ruleName || '',
        schemeId: row.schemeId,
        totalScore: row.totalScore != null ? Number(row.totalScore) : 100,
        higherIsBetter: (row.higherIsBetter === 1 || row.higherIsBetter === true) ? 1 : 0,
        calcMethod: row.calcMethod || 'PIECEWISE',
        status: row.status || 'ACTIVE',
        description: row.description || '',
        segments: (row.segments || []).map(s => ({
          id: s.id,
          seg_order: s.segOrder != null ? s.segOrder : (s.seg_order || 1),
          min_value: s.minValue != null ? Number(s.minValue) : (s.min_value != null ? Number(s.min_value) : null),
          max_value: s.maxValue != null ? Number(s.maxValue) : (s.max_value != null ? Number(s.max_value) : null),
          score: s.score != null ? Number(s.score) : 0,
          segment_desc: s.segmentDesc || s.segment_desc || ''
        }))
      }
      this.ruleModalVisible = true
    },
    /** 在 ruleForm.segments 末尾追加一个空段 (LINEAR 锚点或 PIECEWISE 区间段) */
    addSegment() {
      const next = (this.ruleForm.segments || [])
      const isLinear = this.ruleForm.calcMethod === 'LINEAR'
      // LINEAR 锚点建议：min_value 默认比上一个锚点大 1 (避免重复锚点)
      const lastAnchor = isLinear && next.length ? Number(next[next.length - 1].min_value || 0) : null
      this.ruleForm.segments = [
        ...next,
        {
          seg_order: next.length + 1,
          min_value: isLinear && lastAnchor != null ? lastAnchor + 1 : null,
          max_value: null,
          score: 0,
          segment_desc: ''
        }
      ]
    },
    /**
     * <p>删除 ruleForm.segments 指定索引的段, 自动重排 seg_order</p>
     *
     * @param {number} idx 段索引
     * @returns {void}
     */
    removeSegment(idx) {
      this.ruleForm.segments.splice(idx, 1)
      // 重新排序
      this.ruleForm.segments.forEach((s, i) => { s.seg_order = i + 1 })
    },
    /** 关闭评分规则弹窗时清空 editingRule */
    onRuleModalClosed() {
      this.editingRule = null
    },
    /**
     * <p>提交评分规则 (新增或更新), 带 kpiId/schemeId/ruleName/segments 必填校验</p>
     *
     * @returns {Promise<void>}
     */
    async onSubmitRule() {
      // 校验
      if (!this.ruleForm.kpiId) { this.$message.error('请选择所属指标'); return }
      if (!this.ruleForm.schemeId) { this.$message.error('请选择所属方案'); return }
      if (!this.ruleForm.ruleName || !this.ruleForm.ruleName.trim()) { this.$message.error('请输入规则名称'); return }
      if (!this.ruleForm.segments || !this.ruleForm.segments.length) { this.$message.error('请至少添加一个评分段'); return }
      this.submitting = true
      try {
        // 构造 payload（驼峰 → 下划线）
        const payload = {
          scheme_id: this.ruleForm.schemeId,
          kpi_id: this.ruleForm.kpiId,
          rule_name: this.ruleForm.ruleName,
          calc_method: this.ruleForm.calcMethod,
          total_score: this.ruleForm.totalScore,
          higher_is_better: this.ruleForm.higherIsBetter,
          status: this.ruleForm.status,
          description: this.ruleForm.description,
          segments: this.ruleForm.segments.map(s => ({
            seg_order: s.seg_order,
            min_value: s.min_value,
            max_value: s.max_value,
            score: s.score,
            segment_desc: s.segment_desc || ''
          }))
        }
        if (this.editingRule) {
          await kpiApi.updateScoreRule(this.editingRule.id, payload)
          this.$message.success('已保存')
        } else {
          await kpiApi.createScoreRule(payload)
          this.$message.success('已新增')
        }
        this.ruleModalVisible = false
        this.loadRules()
      } finally { this.submitting = false }
    },
    /**
     * <p>删除评分规则 (带 confirm, 会级联删除该规则下的所有评分段)</p>
     *
     * @param {Object} row 规则行 (含 id/ruleName/segments)
     * @returns {void}
     */
    onDeleteRule(row) {
      const segCount = (row.segments || []).length
      this.$confirm(`确认删除规则 [${row.ruleName}]？${segCount ? '\n将同时删除该规则下的 ' + segCount + ' 个评分段。' : ''}`, '提示', { type: 'warning' })
        .then(async () => { await kpiApi.deleteScoreRule(row.id); this.$message.success('已删除'); this.loadRules() })
        .catch(() => {})
    },

    // ===== 指标方案 Tab =====
    /** 打开新增方案弹窗 */
    onAddScheme() {
      this.editingScheme = null
      this.schemeForm = { schemeCode: '', schemeName: '', description: '', status: 'ACTIVE' }
      this.schemeFormVisible = true
    },
    /**
     * <p>打开编辑方案弹窗, 用行数据回填</p>
     *
     * @param {Object} row 方案行
     * @returns {void}
     */
    onEditScheme(row) {
      this.editingScheme = row
      this.schemeForm = {
        schemeCode: row.schemeCode,
        schemeName: row.schemeName,
        description: row.description || '',
        status: row.status || 'ACTIVE'
      }
      this.schemeFormVisible = true
    },
    /**
     * <p>使用某个方案作为当前方案 (自动跳到指标定义 Tab)</p>
     *
     * @param {Object} row 方案行
     * @returns {void}
     */
    onUseScheme(row) {
      this.currentSchemeId = row.id
      this.activeTab = 'def'
      this.$message.success(`已切换到方案：${row.schemeName}`)
    },
    /**
     * <p>删除方案 (级联, 带 confirm, 删除后若当前方案被删则回退到第一个)</p>
     *
     * @param {Object} row 方案行 (含 id/schemeCode/schemeName)
     * @returns {void}
     */
    onDeleteScheme(row) {
      this.$confirm(`确认删除方案 [${row.schemeCode}] ${row.schemeName}？\n该方案下的指标、规则、值都会失效。`, '提示', { type: 'warning' })
        .then(async () => {
          await kpiApi.deleteScheme(row.id)
          this.$message.success('方案已删除')
          await this.loadAllSchemes()
          await this.loadSchemes()
          // 若删除的恰好是当前选中，重置
          if (this.currentSchemeId === row.id) {
            this.currentSchemeId = this.schemes.length ? this.schemes[0].id : null
          }
        })
        .catch(() => {})
    },
    /** 提交方案弹窗 (新增或更新), 同时刷新两套方案列表 */
    async onSchemeSubmit() {
      await this.$refs.schemeFormRef.validate()
      this.schemeSubmitting = true
      try {
        if (this.editingScheme) {
          await kpiApi.updateScheme(this.editingScheme.id, this.schemeForm)
          this.$message.success('方案已更新')
        } else {
          await kpiApi.createScheme(this.schemeForm)
          this.$message.success('方案已创建')
        }
        this.schemeFormVisible = false
        await this.loadAllSchemes()
        await this.loadSchemes()
      } finally { this.schemeSubmitting = false }
    }
  }
}
</script>

<style scoped>
.kpi-page { padding: 0; }
.page-header { background:#fff; padding:16px 24px; margin-bottom:16px; border-bottom:1px solid #f0f0f0; }
.page-header h2 { margin:0; }
.page-header .desc { color:#999; font-size:13px; margin:4px 0 0; }
.kpi-row { margin:0 16px 16px; }
.kpi-card { text-align:center; padding:8px 0; background:#FFFFFF; border-top:2px solid #0B6FF2; }
.kpi-label { color:#6C7D96; font-size:13px; }
.kpi-value { color:#071B4D; font-size:28px; font-weight:bold; margin:4px 0; }
.kpi-unit { color:#6C7D96; font-size:12px; }
.scheme-pick { margin: 0 16px 16px; background:#F4F8FD; border-left: 3px solid #0B6FF2; }
.pick-label { color:#0B6FF2; font-weight:600; font-size:14px; }
.main-card { margin:0 16px 16px; }

/* ===== Tab3 指标评分：左栏指标 + 右栏规则 ===== */
.kpi-score-layout { display: grid; grid-template-columns: 280px 1fr; gap: 12px; min-height: 500px; }
.kpi-score-left { background:#fff; border:1px solid #E5E7EB; border-radius:8px; padding:12px; max-height: calc(100vh - 320px); display:flex; flex-direction:column; }
.kpi-def-list { flex:1; overflow-y:auto; }
.kpi-def-card {
  padding: 10px 12px; border-radius: 6px; cursor: pointer; margin-bottom: 6px;
  background:#fafafa; border:1px solid #f0f0f0; transition: all .15s;
}
.kpi-def-card:hover { background:#f0f7ff; border-color:#91caff; }
.kpi-def-card.active { background:#e6f4ff; border-color:#0B6FF2; box-shadow: 0 0 0 1px #0B6FF2 inset; }
.kpi-def-code { font-size:12px; color:#888; font-family: monospace; }
.kpi-def-name { font-weight:500; margin-top:2px; color:#25334B; }
.kpi-def-meta { font-size:11px; color:#6C7D96; margin-top:2px; }
.kpi-score-right { background:#fff; border:1px solid #E5E7EB; border-radius:8px; padding:12px; min-height: 480px; }
.empty-pane { padding:120px 0; text-align:center; color:#999; font-size:14px; }
.empty-pane i { color:#0B6FF2; margin-right:6px; }
.empty-tip { padding:20px; text-align:center; color:#aaa; font-size:12px; }
.score-pane-header {
  display:flex; justify-content:space-between; align-items:center;
  padding-bottom:10px; margin-bottom:10px; border-bottom:1px solid #f0f0f0;
}
.kpi-score-title { font-weight:600; font-size:15px; color:#071B4D; }
.kpi-score-title i { color:#0B6FF2; margin-right:6px; }
.seg-panel { padding:8px 12px; background:#fafafa; border-radius:4px; }
.seg-panel-title { margin-bottom:8px; color:#6C7D96; font-size:12px; }
.seg-panel-title i { color:#0B6FF2; margin-right:4px; }
.seg-tag { padding:6px 10px; margin: 0 6px 6px 0; font-size:12px; }
.seg-range { color:#25334B; }
.seg-arrow { color:#0B6FF2; margin: 0 4px; }
.seg-score { color:#0B6FF2; font-weight:600; }
.seg-desc { color:#888; margin-left:4px; }

/* ===== 评分段内联编辑表（弹窗内） ===== */
.seg-block { margin-top: 4px; padding: 8px 0 0; border-top: 1px dashed #E5E7EB; }
.seg-block-header { display:flex; justify-content:space-between; align-items:center; font-weight:500; color:#071B4D; margin-bottom:6px; }
.seg-block-header i { color:#0B6FF2; margin-right:4px; }
.seg-block-tip { color:#6C7D96; font-size:12px; margin-bottom:8px; }
</style>