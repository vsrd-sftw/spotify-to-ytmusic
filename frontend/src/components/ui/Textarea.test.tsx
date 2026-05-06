import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Textarea } from './Textarea'
import { Label } from './Label'
import { FieldError } from './FieldError'

describe('Textarea', () => {
  it('renders textarea element', () => {
    render(<Textarea />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders with custom id and associates with label', () => {
    render(
      <>
        <Label htmlFor="my-textarea">Description</Label>
        <Textarea id="my-textarea" />
      </>
    )
    const textarea = screen.getByLabelText('Description')
    expect(textarea).toBeInTheDocument()
  })

  it('sets aria-invalid when error prop is true', () => {
    render(<Textarea error />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('does not set aria-invalid when error is false', () => {
    render(<Textarea error={false} />)
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('associates error message via aria-describedby', () => {
    render(
      <>
        <Textarea id="test-textarea" error />
        <FieldError id="test-textarea-error">Invalid input</FieldError>
      </>
    )
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('aria-describedby', 'test-textarea-error')
  })
})