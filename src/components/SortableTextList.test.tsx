import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SortableTextList, { moveItem } from './SortableTextList'

describe('moveItem', () => {
  it('往后移', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })

  it('往前移', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
  })

  it('原地不动时返回原数组，不产生新引用', () => {
    const arr = ['a', 'b']
    expect(moveItem(arr, 1, 1)).toBe(arr)
  })

  it('下标越界时不改动', () => {
    const arr = ['a', 'b']
    expect(moveItem(arr, 0, 9)).toBe(arr)
    expect(moveItem(arr, -1, 0)).toBe(arr)
  })

  it('不修改原数组', () => {
    const arr = ['a', 'b', 'c']
    moveItem(arr, 0, 2)
    expect(arr).toEqual(['a', 'b', 'c'])
  })
})

/** 受控包装，模拟 antd Form.Item 注入 value/onChange 的方式。 */
function Harness({ initial = [] as string[] }) {
  const [v, setV] = useState<string[]>(initial)
  return (
    <>
      <SortableTextList value={v} onChange={setV} />
      <output data-testid="order">{v.join(' > ')}</output>
    </>
  )
}

describe('SortableTextList', () => {
  it('按数组顺序渲染，并显示序号', () => {
    render(<Harness initial={['开篇引入', '分点展开', '结尾总结']} />)
    expect(screen.getByTestId('order')).toHaveTextContent('开篇引入 > 分点展开 > 结尾总结')
    // 序号跟着位置走
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('回车添加，追加到末尾', async () => {
    const user = userEvent.setup()
    render(<Harness initial={['开篇引入']} />)
    await user.type(screen.getByRole('textbox'), '结尾总结{Enter}')
    expect(screen.getByTestId('order')).toHaveTextContent('开篇引入 > 结尾总结')
  })

  it('删除某一项', async () => {
    const user = userEvent.setup()
    render(<Harness initial={['开篇引入', '分点展开']} />)
    await user.click(screen.getByLabelText('删除「开篇引入」'))
    expect(screen.getByTestId('order')).toHaveTextContent('分点展开')
    expect(screen.queryByText('开篇引入')).not.toBeInTheDocument()
  })

  it('拒绝重名——条目值当拖拽 id，重复会让排序错乱', async () => {
    const user = userEvent.setup()
    render(<Harness initial={['开篇引入']} />)
    await user.type(screen.getByRole('textbox'), '开篇引入{Enter}')
    expect(screen.getByText('已经有同名的了')).toBeInTheDocument()
    expect(screen.getByTestId('order')).toHaveTextContent('开篇引入')
  })

  it('空白输入不添加', async () => {
    const user = userEvent.setup()
    render(<Harness initial={[]} />)
    await user.type(screen.getByRole('textbox'), '   {Enter}')
    expect(screen.getByTestId('order')).toHaveTextContent('')
  })
})
