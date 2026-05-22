import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getFamilyCommunicationsSurface } from './lib/phase16-data.js';

describe('phase 16 family communications web surface', () => {
  it('renders the guardian communications dashboard', async () => {
    const { FamilyCommunications } = await import('./components/phase16/family-communications.js');
    const surface = getFamilyCommunicationsSurface();

    const markup = renderToStaticMarkup(<FamilyCommunications surface={surface} />);

    expect(markup).toContain('Guardian communications');
    expect(markup).toContain('Family inbox health');
    expect(markup).toContain('Kantipur International School');
    expect(markup).toContain('Delivery queue');
  });

  it('renders bilingual guardian template text', async () => {
    const { FamilyCommunications } = await import('./components/phase16/family-communications.js');
    const surface = getFamilyCommunicationsSurface();

    const markup = renderToStaticMarkup(<FamilyCommunications surface={surface} />);

    expect(markup).toContain('Fixture moved to 14:30 at Dasharath Field B.');
    expect(markup).toContain('खेल तालिका १४:३० बजे दशरथ मैदान बीमा सारिएको छ।');
    expect(markup).toContain('Waiver reminder');
  });

  it('shows moderated thread state before guardian replies publish', async () => {
    const { FamilyCommunications } = await import('./components/phase16/family-communications.js');
    const surface = getFamilyCommunicationsSurface();

    const markup = renderToStaticMarkup(<FamilyCommunications surface={surface} />);

    expect(markup).toContain('Moderated');
    expect(markup).toContain('Coach reply waiting for school admin approval');
    expect(markup).toContain('Visible to guardians after approval');
  });

  it('keeps family communications free of private DOB, document, and storage fields', async () => {
    const { FamilyCommunications } = await import('./components/phase16/family-communications.js');
    const surface = getFamilyCommunicationsSurface();
    const payload = JSON.stringify(surface);
    const markup = renderToStaticMarkup(<FamilyCommunications surface={surface} />);
    const renderedAndSerialized = `${payload} ${markup}`;

    expect(renderedAndSerialized).not.toContain('dateOfBirth');
    expect(renderedAndSerialized).not.toContain('dob');
    expect(renderedAndSerialized).not.toContain('documentBucket');
    expect(renderedAndSerialized).not.toContain('documentUrl');
    expect(renderedAndSerialized).not.toContain('storageKey');
    expect(renderedAndSerialized).not.toContain('guardianContact');
  });
});
