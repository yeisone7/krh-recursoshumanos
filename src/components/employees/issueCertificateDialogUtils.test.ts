import { describe, expect, it } from 'vitest';

import {
  CERTIFICATE_DIALOG_CANCEL_BUTTON_CLASSNAME,
  CERTIFICATE_DIALOG_SUBMIT_BUTTON_CLASSNAME,
} from './issueCertificateDialogUtils';

describe('IssueCertificateDialog footer actions', () => {
  it('keeps the secondary action readable on the light footer surface', () => {
    expect(CERTIFICATE_DIALOG_CANCEL_BUTTON_CLASSNAME).toContain('text-slate-700');
    expect(CERTIFICATE_DIALOG_CANCEL_BUTTON_CLASSNAME).toContain('hover:text-slate-900');
  });

  it('keeps the primary action text and icon white on the primary background', () => {
    expect(CERTIFICATE_DIALOG_SUBMIT_BUTTON_CLASSNAME).toContain('bg-primary');
    expect(CERTIFICATE_DIALOG_SUBMIT_BUTTON_CLASSNAME).toContain('text-white');
    expect(CERTIFICATE_DIALOG_SUBMIT_BUTTON_CLASSNAME).toContain('hover:text-white');
  });
});
