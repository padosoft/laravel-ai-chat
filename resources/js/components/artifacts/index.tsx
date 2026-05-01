import type { ReactNode } from 'react';
import { ImageArtifact } from './ImageArtifact';
import { DocArtifact } from './DocArtifact';
import { LinkArtifact } from './LinkArtifact';
import { CodeArtifact } from './CodeArtifact';
import { TableArtifact } from './TableArtifact';

export type ArtifactPayload =
    | { __artifact: 'image'; url: string; alt: string; caption?: string }
    | { __artifact: 'doc'; title: string; mime: string; pages: number; snippet: string; fakeUrl: string }
    | {
          __artifact: 'links';
          topic: string;
          links: Array<{ title: string; url: string; description: string }>;
      }
    | { __artifact: 'code'; language: string; topic: string; code: string }
    | {
          __artifact: 'table';
          topic: string;
          columns: string[];
          rows: Array<Array<string | number>>;
      };

/**
 * Try to parse a tool output as an Artifact payload. Tools return JSON
 * strings of `{ __artifact: '<kind>', ... }`. Anything else returns
 * null (the bubble component then renders nothing for the tool part).
 */
export function tryParseArtifact(output: unknown): ArtifactPayload | null {
    if (typeof output !== 'string') {
        // Some SDK transports may already deserialize the output.
        if (
            output !== null &&
            typeof output === 'object' &&
            '__artifact' in (output as Record<string, unknown>)
        ) {
            return output as ArtifactPayload;
        }
        return null;
    }
    try {
        const parsed: unknown = JSON.parse(output);
        if (
            parsed !== null &&
            typeof parsed === 'object' &&
            '__artifact' in (parsed as Record<string, unknown>)
        ) {
            return parsed as ArtifactPayload;
        }
    } catch {
        return null;
    }
    return null;
}

export function renderArtifact(payload: ArtifactPayload): ReactNode {
    switch (payload.__artifact) {
        case 'image':
            return <ImageArtifact url={payload.url} alt={payload.alt} caption={payload.caption} />;
        case 'doc':
            return <DocArtifact {...payload} />;
        case 'links':
            return <LinkArtifact topic={payload.topic} links={payload.links} />;
        case 'code':
            return <CodeArtifact language={payload.language} code={payload.code} topic={payload.topic} />;
        case 'table':
            return <TableArtifact columns={payload.columns} rows={payload.rows} />;
    }
}
