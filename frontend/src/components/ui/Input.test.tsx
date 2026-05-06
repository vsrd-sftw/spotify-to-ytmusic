import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from './Input'
import { Label } from './Label'
import { FieldError } from './FieldError'

describe('Input', () => {
  it('renders input element', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders with custom id and associates with label', () => {
    render(
      <>
        <Label htmlFor="my-input">Username</Label>
        <Input id="my-input" />
      </>
    )
    const input = screen.getByLabelText('Username')
    expect(input).toBeInTheDocument()
  })

  it('associates label via htmlFor', () => {
    render(
      <>
        <Label htmlFor="test-input">Email</Label>
        <Input id="test-input" />
      </>
    )
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'test-input')
  })

  it('sets aria-invalid when error prop is true', () => {
    render(<Input error />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('does not set aria-invalid when error is false', () => {
    render(<Input error={false} />)
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('associates error message via aria-describedby', () => {
    render(
      <>
        <Input id="test-input" error />
        <FieldError id="test-input-error">Invalid input</FieldError>
      </>
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-describedby', 'test-input-error')
  })
})

describe('Label', () => {
  it('renders label with htmlFor', () => {
    render(<Label htmlFor="test-id">Test Label</Label>)
    const label = screen.getByText('Test Label')
    expect(label).toHaveAttribute('for', 'test-id')
  })
})

describe('FieldError', () => {
  it('renders error message with role alert', () => {
    render(<FieldError>Error message</FieldError>)
    expect(screen.getByRole('alert')).toHaveTextContent('Error message')
  })

  it('renders with custom id', () => {
    render(<FieldError id="custom-error">Custom error</FieldError>)
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'custom-error')
  })
})