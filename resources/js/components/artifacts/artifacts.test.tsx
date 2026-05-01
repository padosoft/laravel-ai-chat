import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderArtifact, tryParseArtifact, type ArtifactPayload } from './index';

describe('tryParseArtifact', () => {
    it('parses a JSON-encoded image artifact', () => {
        const result = tryParseArtifact(
            JSON.stringify({ __artifact: 'image', url: 'https://x/y.png', alt: 'Demo' }),
        );

        expect(result).not.toBeNull();
        expect(result?.__artifact).toBe('image');
    });

    it('returns null for non-JSON tool output', () => {
        expect(tryParseArtifact('not json')).toBeNull();
        expect(tryParseArtifact(null)).toBeNull();
        expect(tryParseArtifact(undefined)).toBeNull();
    });

    it('accepts already-deserialised objects as a passthrough', () => {
        const payload = { __artifact: 'image', url: 'x', alt: 'y' };
        expect(tryParseArtifact(payload)).toEqual(payload);
    });
});

describe('renderArtifact', () => {
    it('renders an image artifact', () => {
        const payload: ArtifactPayload = {
            __artifact: 'image',
            url: 'https://example.com/x.png',
            alt: 'Demo',
            caption: 'A demo image',
        };

        render(<>{renderArtifact(payload)}</>);

        expect(screen.getByTestId('artifact-image')).toBeInTheDocument();
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', 'https://example.com/x.png');
        expect(img).toHaveAttribute('alt', 'Demo');
        expect(screen.getByText('A demo image')).toBeInTheDocument();
    });

    it('renders a code artifact with copy button and language label', () => {
        const payload: ArtifactPayload = {
            __artifact: 'code',
            language: 'php',
            topic: 'demo',
            code: '<?php echo "hi";',
        };

        render(<>{renderArtifact(payload)}</>);

        expect(screen.getByTestId('artifact-code')).toBeInTheDocument();
        expect(screen.getByText('php')).toBeInTheDocument();
        expect(screen.getByText('Copy')).toBeInTheDocument();
        expect(screen.getByText('<?php echo "hi";')).toBeInTheDocument();
    });

    it('renders a table artifact with all rows and columns', () => {
        const payload: ArtifactPayload = {
            __artifact: 'table',
            topic: 'demo',
            columns: ['Model', 'Hosted'],
            rows: [
                ['Llama-3.3-70B', 'Italy'],
                ['Qwen3-8B', 'Italy'],
            ],
        };

        render(<>{renderArtifact(payload)}</>);

        expect(screen.getByTestId('artifact-table')).toBeInTheDocument();
        expect(screen.getByText('Llama-3.3-70B')).toBeInTheDocument();
        expect(screen.getByText('Qwen3-8B')).toBeInTheDocument();
    });
});
