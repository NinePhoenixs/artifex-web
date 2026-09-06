import { useState } from 'react'
import { DeleteOutlined, HolderOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Input, Typography } from 'antd'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/** 纯函数，好测。越界或原地不动时返回原数组。 */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to) return arr
  if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

interface Props {
  value?: string[]
  onChange?: (v: string[]) => void
  placeholder?: string
  /** 每行前面显示序号——顺序有业务含义时打开。 */
  numbered?: boolean
}

/**
 * 可拖拽排序的文本列表。
 *
 * 用在「自定义段落」上：**顺序就是正文段落的顺序**，标签输入框做不到这件事
 * （只能删了重加来调顺序）。
 *
 * 条目值本身当拖拽 id，所以**不允许重复**——段落名重复本来也没意义。
 */
export default function SortableTextList({
  value = [],
  onChange,
  placeholder = '输入后按回车添加',
  numbered = true,
}: Props) {
  const [draft, setDraft] = useState('')
  const [warn, setWarn] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const add = () => {
    const text = draft.trim()
    if (!text) return
    if (value.includes(text)) {
      setWarn('已经有同名的了')
      return
    }
    onChange?.([...value, text])
    setDraft('')
    setWarn('')
  }

  const remove = (text: string) => onChange?.(value.filter((v) => v !== text))

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    onChange?.(
      moveItem(value, value.indexOf(String(active.id)), value.indexOf(String(over.id))),
    )
  }

  return (
    <div>
      {value.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={value} strategy={verticalListSortingStrategy}>
            <div style={{ marginBottom: 10 }}>
              {value.map((text, i) => (
                <Row
                  key={text}
                  id={text}
                  index={i}
                  numbered={numbered}
                  onRemove={() => remove(text)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => {
            setDraft(e.target.value)
            setWarn('')
          }}
          onPressEnter={(e) => {
            e.preventDefault()
            add()
          }}
        />
        <Button icon={<PlusOutlined />} onClick={add}>
          添加
        </Button>
      </div>

      {warn && (
        <Typography.Text type="warning" style={{ fontSize: 12 }}>
          {warn}
        </Typography.Text>
      )}
    </div>
  )
}

function Row({
  id,
  index,
  numbered,
  onRemove,
}: {
  id: string
  index: number
  numbered: boolean
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        marginBottom: 6,
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        background: isDragging ? '#f5f8ff' : '#fff',
        boxShadow: isDragging ? '0 4px 12px rgba(15,23,42,.12)' : 'none',
        opacity: isDragging ? 0.9 : 1,
      }}
    >
      <span
        {...attributes}
        {...listeners}
        style={{ cursor: 'grab', color: '#94a3b8', display: 'flex' }}
        aria-label={`拖动调整「${id}」的位置`}
      >
        <HolderOutlined />
      </span>
      {numbered && (
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            background: '#eff4ff',
            color: '#2563eb',
            fontSize: 11,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>{id}</span>
      <Button
        type="text"
        size="small"
        icon={<DeleteOutlined />}
        aria-label={`删除「${id}」`}
        onClick={onRemove}
      />
    </div>
  )
}
