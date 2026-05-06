import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { List, ListItem, ListItemLeading, ListItemTrailing } from './List'

describe('List', () => {
  it('renders list container', () => {
    render(
      <List>
        <ListItem id="1">Item 1</ListItem>
      </List>
    )
    expect(screen.getByText('Item 1')).toBeInTheDocument()
  })

  it('renders multiple items', () => {
    render(
      <List>
        <ListItem id="1">Item 1</ListItem>
        <ListItem id="2">Item 2</ListItem>
      </List>
    )
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })

  it('renders ListItemLeading slot', () => {
    render(
      <List>
        <ListItem id="1">
          <ListItemLeading>Leading</ListItemLeading>
          Content
        </ListItem>
      </List>
    )
    expect(screen.getByText('Leading')).toBeInTheDocument()
  })

  it('renders ListItemTrailing slot', () => {
    render(
      <List>
        <ListItem id="1">
          Content
          <ListItemTrailing>Trailing</ListItemTrailing>
        </ListItem>
      </List>
    )
    expect(screen.getByText('Trailing')).toBeInTheDocument()
  })
})

describe('ListItem selection', () => {
  it('calls onSelect when clicked (context)', () => {
    const onSelect = vi.fn()
    render(
      <List onSelect={onSelect}>
        <ListItem id="item-1">Item 1</ListItem>
      </List>
    )
    fireEvent.click(screen.getByText('Item 1'))
    expect(onSelect).toHaveBeenCalledWith('item-1')
  })

  it('calls onSelect when clicked (prop)', () => {
    const onSelect = vi.fn()
    render(
      <List>
        <ListItem id="item-1" onSelect={onSelect}>Item 1</ListItem>
      </List>
    )
    fireEvent.click(screen.getByText('Item 1'))
    expect(onSelect).toHaveBeenCalledWith('item-1')
  })

  it('propaga onSelect to parent', () => {
    const onSelect = vi.fn()
    render(
      <List onSelect={onSelect}>
        <ListItem id="test-id">Test Item</ListItem>
      </List>
    )
    fireEvent.click(screen.getByText('Test Item'))
    expect(onSelect).toHaveBeenCalledWith('test-id')
  })

  it('shows selected state when id is in selectedIds', () => {
    render(
      <List selectedIds={['selected-1']}>
        <ListItem id="selected-1">Selected Item</ListItem>
        <ListItem id="unselected-1">Unselected Item</ListItem>
      </List>
    )
    const listItems = screen.getAllByRole('listitem')
    expect(listItems[0]).toHaveClass('bg-blue-50')
    expect(listItems[1]).not.toHaveClass('bg-blue-50')
  })
})