import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignatureCanvas } from './SignatureCanvas';

const context = {fillRect:vi.fn(),beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),stroke:vi.fn(),getImageData:vi.fn()};
describe('signature capture',()=>{
  beforeEach(()=>{
    vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,signature');
    context.getImageData.mockReturnValue({data:new Uint8ClampedArray(80).fill(255)});
  });
  const draw=()=>{const canvas=screen.getByLabelText('Área para dibujar tu firma');fireEvent.mouseDown(canvas,{clientX:10,clientY:10});fireEvent.mouseMove(canvas,{clientX:100,clientY:50});fireEvent.mouseUp(canvas);};
  it('rejects a tap and a canvas containing no ink',()=>{
    const save=vi.fn();render(<SignatureCanvas onSave={save}/>);
    fireEvent.mouseDown(screen.getByLabelText('Área para dibujar tu firma'));
    fireEvent.mouseUp(screen.getByLabelText('Área para dibujar tu firma'));
    expect(screen.getByText('Confirmar Firma')).toBeDisabled();
    draw();fireEvent.click(screen.getByText('Confirmar Firma'));expect(save).not.toHaveBeenCalled();
  });
  it('saves an actual stroke and clears the ability to submit after erasing',()=>{
    const pixels=new Uint8ClampedArray(80);for(let i=3;i<pixels.length;i+=4)pixels[i]=255;
    context.getImageData.mockReturnValue({data:pixels});const save=vi.fn();render(<SignatureCanvas onSave={save}/>);
    draw();fireEvent.click(screen.getByText('Confirmar Firma'));expect(save).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText('Limpiar'));expect(screen.getByText('Confirmar Firma')).toBeDisabled();
  });
  it('blocks drawing and submission while saving',()=>{
    const save=vi.fn();render(<SignatureCanvas onSave={save} disabled saving/>);draw();
    expect(screen.getByText('Guardando…')).toBeDisabled();expect(screen.getByText('Limpiar')).toBeDisabled();expect(save).not.toHaveBeenCalled();
  });
});
