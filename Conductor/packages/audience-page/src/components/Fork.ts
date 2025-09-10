import { ForkNode } from '../types/conductor-types';
import { Choice } from '../types';
import { EventEmitter } from '../core/EventEmitter';

/**
 * Fork component for displaying voting interface
 */
export class Fork extends EventEmitter<{
  choice_selected: number;
  countdown_complete: void;
}> {
  private container: HTMLElement;
  private timerElement: HTMLElement | null = null;
  private choicesContainer: HTMLElement | null = null;
  private choices: Choice[] = [];
  private selectedIndex: number | null = null;
  private isLocked = false;
  private isVoting = false;

  constructor(container: HTMLElement) {
    super();
    this.container = container;
  }

  /**
   * Render fork with choices and timer
   */
  render(node: ForkNode, countdown: number | null = null, isVoting: boolean = false): void {

    this.container.innerHTML = '';
    this.container.className = `fork ${!isVoting ? 'fork--inactive' : ''}`;
    this.isVoting = isVoting;

    // Extract choices from node
    this.choices = node.choices.map((choice, index) => ({
      index,
      label: choice.label,
      nextStateId: choice.nextStateId
    }));

    // Create timer
    this.createTimer(countdown);

    // Create choices
    this.createChoices();

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Update countdown timer
   */
  updateCountdown(seconds: number): void {
    if (this.timerElement) {
      this.timerElement.textContent = this.formatCountdown(seconds);
    }

    // Update countdown on buttons when in inactive state
    this.updateButtonCountdown(seconds);

    if (seconds === 0 && !this.isLocked) {
      this.lockInterface();
      this.emit('countdown_complete');
    }
  }

  /**
   * Update selected choice
   */
  updateSelection(choiceIndex: number | null): void {
    // Only update selection if it has actually changed
    if (this.selectedIndex === choiceIndex) {
      return;
    }

    this.selectedIndex = choiceIndex;
    this.updateChoiceStyles();
  }

  /**
   * Update voting state
   */
  updateVotingState(isVoting: boolean): void {
    // Only update if the voting state has actually changed
    if (this.isVoting === isVoting) {
      return;
    }

    const wasVoting = this.isVoting;
    this.isVoting = isVoting;

    // Update the container class to reflect voting state
    if (!isVoting) {
      this.container.classList.add('fork--inactive');
    } else {
      this.container.classList.remove('fork--inactive');
    }

    // Only update styles if voting state actually changed from voting to not voting or vice versa
    // This prevents unnecessary updates during countdown changes within the same voting state
    if (wasVoting !== isVoting) {
      this.updateChoiceStyles();
    }
  }

  /**
   * Lock interface when voting ends
   */
  lockInterface(): void {
    this.isLocked = true;
    
    if (this.choicesContainer) {
      const buttons = this.choicesContainer.querySelectorAll('.fork__choice');
      buttons.forEach(button => {
        button.classList.add('fork__choice--disabled');
      });
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.removeAllListeners();
    this.container.innerHTML = '';
    this.timerElement = null;
    this.choicesContainer = null;
    this.choices = [];
    this.selectedIndex = null;
    this.isLocked = false;
  }

  private createTimer(countdown: number | null): void {
    this.timerElement = document.createElement('div');
    this.timerElement.className = 'fork__timer';
    this.timerElement.setAttribute('role', 'timer');
    this.timerElement.setAttribute('aria-live', 'assertive');
    this.timerElement.textContent = this.formatCountdown(countdown);
    
    this.container.appendChild(this.timerElement);
  }

  private createChoices(): void {
    this.choicesContainer = document.createElement('div');
    this.choicesContainer.className = 'fork__choices';
    this.choicesContainer.setAttribute('role', 'radiogroup');
    this.choicesContainer.setAttribute('aria-label', 'Vote for your choice');

    this.choices.forEach(choice => {
      const button = this.createChoiceButton(choice);
      this.choicesContainer!.appendChild(button);
    });

    this.container.appendChild(this.choicesContainer);
  }

  private createChoiceButton(choice: Choice): HTMLElement {
    const button = document.createElement('button');
    button.className = 'fork__choice';
    button.setAttribute('data-index', choice.index.toString());
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');
    button.setAttribute('aria-labelledby', `choice-${choice.index}`);
    button.setAttribute('data-countdown', ''); // Initialize countdown attribute
    button.textContent = choice.label;

    // Add label element for better accessibility
    const label = document.createElement('span');
    label.id = `choice-${choice.index}`;
    label.className = 'sr-only';
    label.textContent = `Option ${choice.index + 1}: ${choice.label}`;
    button.appendChild(label);

    return button;
  }

  private setupEventListeners(): void {
    if (!this.choicesContainer) return;

    // Simple click handler for both mouse and touch
    this.choicesContainer.addEventListener('click', (event) => {
      this.handleChoiceSelection(event);
    });

    // Handle touch events for mobile - use touchstart to avoid preventDefault issues
    this.choicesContainer.addEventListener('touchstart', (event) => {
      this.handleChoiceSelection(event);
    }, { passive: true });
  }

  private handleChoiceSelection(event: Event): void {
    // Check if voting is allowed
    if (this.isLocked || !this.isVoting) return;

    const target = event.target as HTMLElement;
    if (!target.classList.contains('fork__choice')) return;

    const indexStr = target.getAttribute('data-index');
    if (indexStr === null) return;

    const index = parseInt(indexStr, 10);
    this.selectChoice(index);
  }

  private selectChoice(index: number): void {
    if (this.isLocked || index < 0 || index >= this.choices.length) {
      return;
    }

    // Set the selected choice
    this.selectedIndex = index;

    // Update visual feedback
    this.updateChoiceStyles();

    // Emit selection event
    this.emit('choice_selected', index);
  }

  private updateChoiceStyles(): void {
    if (!this.choicesContainer) return;

    const buttons = this.choicesContainer.querySelectorAll('.fork__choice');

    // Clear all selection states first
    buttons.forEach(button => {
      button.classList.remove('fork__choice--selected');
      button.setAttribute('aria-checked', 'false');
    });

    // Apply selected state to the chosen button
    if (this.selectedIndex !== null && this.selectedIndex >= 0 && this.selectedIndex < buttons.length) {
      const selectedButton = buttons[this.selectedIndex];
      if (selectedButton) {
        selectedButton.classList.add('fork__choice--selected');
        selectedButton.setAttribute('aria-checked', 'true');
      }
    }
  }

  private updateButtonCountdown(seconds: number): void {
    if (!this.choicesContainer) return;

    const buttons = this.choicesContainer.querySelectorAll('.fork__choice');
    const countdownText = this.formatCountdown(seconds);

    buttons.forEach(button => {
      button.setAttribute('data-countdown', countdownText);
    });
  }

  private formatCountdown(seconds: number | null): string {
    if (seconds === null || seconds < 0) {
      return '';
    }
    
    // Format as SS (e.g., "05", "04", etc.)
    return seconds.toString().padStart(2, '0');
  }
}
