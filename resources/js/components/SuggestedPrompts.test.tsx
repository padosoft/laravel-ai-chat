import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SuggestedPrompts } from './SuggestedPrompts';

describe('SuggestedPrompts', () => {
    it('renders five suggested-prompt pills', () => {
        render(<SuggestedPrompts onPick={() => {}} />);

        expect(screen.getByTestId('suggested-prompt-foto-del-colosseo')).toBeInTheDocument();
        expect(screen.getByTestId('suggested-prompt-documento-nda')).toBeInTheDocument();
        expect(screen.getByTestId('suggested-prompt-link-su-regolo')).toBeInTheDocument();
        expect(screen.getByTestId('suggested-prompt-snippet-php')).toBeInTheDocument();
        expect(screen.getByTestId('suggested-prompt-tabella-modelli')).toBeInTheDocument();
    });

    it('invokes onPick with the matching prompt text when a pill is clicked', async () => {
        const onPick = vi.fn();
        const user = userEvent.setup();

        render(<SuggestedPrompts onPick={onPick} />);

        await user.click(screen.getByTestId('suggested-prompt-foto-del-colosseo'));

        expect(onPick).toHaveBeenCalledTimes(1);
        expect(onPick).toHaveBeenCalledWith('Mostrami una foto del Colosseo al tramonto');
    });
});
