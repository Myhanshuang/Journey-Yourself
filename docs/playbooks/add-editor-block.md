# Add Editor Block Playbook

## 目标

指导如何新增一种可插入 editor 的块类型。

## 一个 editor block 通常包含 4 部分

1. TipTap extension
2. 编辑器插入入口
3. 只读展示组件
4. 公开分享兼容显示

## 典型位置

- extension:
  - `frontend/src/components/extensions/*`
- picker/modal:
  - `frontend/src/features/...` 或 `components/modals/*`
- editor wiring:
  - `frontend/src/components/Editor.tsx`

## 检查项

- 编辑时能插入
- 重新打开 diary 能显示
- 详情页能显示
- 分享页能显示
- 内容 schema 没破坏

## 不要做

- 只做 editor 能插入，不做只读显示
- 直接把 provider-specific 逻辑全塞进 `Editor.tsx`
